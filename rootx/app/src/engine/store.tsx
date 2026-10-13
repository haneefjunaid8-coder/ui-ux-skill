import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppState, Action } from './core';
export * from './core';

/* ============================================================================
   ROOT-X client store — networked.
   ----------------------------------------------------------------------------
   The server (rootx/server) owns the state and runs the reducer; this provider
   mirrors it over HTTP + SSE. dispatch() POSTs the action; the response and the
   SSE stream carry the (viewer-redacted) state. Offline actions queue and
   replay — never fake success (constraint C-8).
   ========================================================================== */

const StateCtx = createContext<AppState>(null!);
const DispatchCtx = createContext<(action: Action) => Promise<{ state?: AppState } | null>>(async () => null);
const NetCtx = createContext<{ online: boolean; queued: number }>({ online: true, queued: 0 });

export function RootXProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
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

  // boot: fetch current state, then subscribe to the live stream
  useEffect(() => {
    let cancelled = false;
    fetch('/api/state', { credentials: 'include' })
      .then((r) => r.json() as Promise<{ state: AppState }>)
      .then((d) => {
        if (!cancelled) setState(d.state);
      })
      .catch(() => setOnline(false));

    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data) as { type: 'state'; state: AppState } | { type: 'clock'; epoch: number };
      if (msg.type === 'state') setState(msg.state);
      else if (msg.type === 'clock') setState((s) => (s ? { ...s, clock: { ...s.clock, epoch: msg.epoch } } : s));
    };
    es.onopen = () => setOnline(true);
    es.onerror = () => setOnline(false); // EventSource auto-reconnects
    // when the stream returns, drain any queued actions
    const drain = setInterval(() => void flush(), 4000);
    return () => {
      cancelled = true;
      es.close();
      clearInterval(drain);
    };
  }, [flush]);

  const net = useRef({ online, queued });
  net.current = { online, queued };

  if (state === null) {
    return (
      <div className="boot-splash" role="status" aria-label="Connecting to ROOT-X">
        <div className="boot-orb" aria-hidden />
        <p>Connecting to ROOT-X…</p>
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
