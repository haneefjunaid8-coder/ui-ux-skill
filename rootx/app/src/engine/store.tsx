import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppState, Action } from './core';
import { reducer, init } from './core';
export * from './core';

/* ============================================================================
   ROOT-X client store — networked.
   ----------------------------------------------------------------------------
   The server (rootx/server) owns the state and runs the reducer; this provider
   mirrors it over HTTP + SSE. dispatch() POSTs the action; the response and the
   SSE stream carry the (viewer-redacted) state. Offline actions queue and
   replay — never fake success (constraint C-8).
   ========================================================================== */

/* Standalone single-file build (ROOT-X.html): the engine runs in this tab —
 * no server, localStorage persistence. The networked product mode below is
 * unchanged. */
const STANDALONE = (() => {
  try {
    return !!__ROOTX_STANDALONE__;
  } catch {
    return false;
  }
})();
const LS_KEY = 'rootx-standalone-v1';
function loadLocal(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AppState;
    return s.version === 1 ? { ...s, topups: s.topups ?? [] } : null;
  } catch {
    return null;
  }
}

const StateCtx = createContext<AppState>(null!);
const DispatchCtx = createContext<(action: Action) => Promise<{ state?: AppState } | null>>(async () => null);
const NetCtx = createContext<{ online: boolean; queued: number }>({ online: true, queued: 0 });

export function RootXProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(STANDALONE ? loadLocal() ?? init() : null);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const queue = useRef<Action[]>([]);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (queue.current.length) {
        const action = queue.current[0];
        try {
          const r = await fetch('/api/action', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(action),
          });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const d = (await r.json()) as { state?: AppState };
          queue.current.shift();
          setQueued(queue.current.length);
          if (d.state) setState(d.state);
          setOnline(true);
        } catch {
          setOnline(false);
          break; // retry from the same action when connectivity returns
        }
      }
    } finally {
      flushing.current = false;
    }
  }, []);

  const dispatch = useCallback(
    (action: Action): Promise<{ state?: AppState } | null> => {
      if (STANDALONE) {
        const base = stateRef.current ?? loadLocal() ?? init();
        const next = reducer(base, action);
        stateRef.current = next;
        setState(next);
        return Promise.resolve({ state: next });
      }
      // Send immediately; if the network fails, queue for retry (never fake
      // success) and resolve null so the caller can show an honest state.
      return (async () => {
        try {
          const r = await fetch('/api/action', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(action),
          });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const d = (await r.json()) as { state?: AppState };
          if (d.state) setState(d.state);
          setOnline(true);
          return d;
        } catch {
          setOnline(false);
          queue.current.push(action);
          setQueued(queue.current.length);
          void flush();
          return null;
        }
      })();
    },
    [flush],
  );

  // standalone: drive the engine clock locally (gateway webhooks, matching,
  // safety hours) and persist to localStorage; no server to talk to.
  useEffect(() => {
    if (!STANDALONE) return;
    const t = setInterval(() => {
      setState((s) => {
        if (!s) return s;
        const next = reducer(s, { type: 'tick' });
        stateRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (STANDALONE && state) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {
        /* private mode — session-only is fine */
      }
    }
  }, [state]);

  // boot: fetch current state, then subscribe to the live stream. The boot
  // fetch is retried while offline so an installed PWA opened without a
  // connection still comes up the moment the network returns.
  useEffect(() => {
    if (STANDALONE) return;
    let cancelled = false;
    const boot = () => {
      fetch('/api/state', { credentials: 'include' })
        .then((r) => r.json() as Promise<{ state: AppState }>)
        .then((d) => {
          if (!cancelled && d.state) {
            stateRef.current = d.state;
            setState(d.state);
            setOnline(true);
          }
        })
        .catch(() => setOnline(false));
    };
    boot();

    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data) as { type: 'state'; state: AppState } | { type: 'clock'; epoch: number };
      if (msg.type === 'state') setState(msg.state);
      else if (msg.type === 'clock') setState((s) => (s ? { ...s, clock: { ...s.clock, epoch: msg.epoch } } : s));
    };
    es.onopen = () => {
      setOnline(true);
      if (!stateRef.current) boot(); // stream is back but the shell never loaded
    };
    es.onerror = () => setOnline(false); // EventSource auto-reconnects
    // when the stream returns, drain any queued actions
    const drain = setInterval(() => {
      if (!stateRef.current) boot();
      else void flush();
    }, 4000);
    return () => {
      cancelled = true;
      es.close();
      clearInterval(drain);
    };
  }, [flush]);

  const net = useRef({ online, queued });
  net.current = { online, queued };
  const stateRef = useRef<AppState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  if (state === null) {
    return (
      <div className="boot-splash" role="status" aria-label="Connecting to ROOT-X">
        <div className="boot-orb" aria-hidden />
        <p>{online ? 'Connecting to ROOT-X…' : 'You’re offline — ROOT-X will reconnect when the network returns.'}</p>
      </div>
    );
  }

  return (
    <NetCtx.Provider value={net.current}>
      <StateCtx.Provider value={state}>
        <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
      </StateCtx.Provider>
    </NetCtx.Provider>
  );
}

export function useRootX() {
  return useContext(StateCtx);
}
export function useDispatchRootX() {
  return useContext(DispatchCtx);
}
export function useNet() {
  return useContext(NetCtx);
}
