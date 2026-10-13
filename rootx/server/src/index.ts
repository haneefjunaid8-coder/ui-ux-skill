import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer, init } from '../../app/src/engine/core';
import type { AppState, Action } from '../../app/src/engine/core';
import type { Delivery, UserAccount } from '../../app/src/engine/types';

/* ============================================================================
   ROOT-X API server.
   ----------------------------------------------------------------------------
   The rules engine (../app/src/engine/core.ts) is the authority: every action
   runs through the same reducer the tests exercise. This server adds what a
   browser cannot be trusted with (constraint C-7/C-8): sessions, actor
   injection, per-viewer redaction, a real-time SSE fan-out, a server clock,
   and durable persistence in SQLite.

   Simulation is DISABLED here (state.simEnabled = false): demo riders are
   parked unavailable and no delivery advances on its own — a real rider
   session must accept offers, enter codes and drive the run.

   Demo payment gateway: card/transfer webhooks resolve after realistic delays
   (no real money). SMS/OTP is not connected — the code is returned to the
   requester only (documented unresolved decision U-8).
   ========================================================================== */

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, '..', 'data');
const TICK_MS = 1000;
const COOKIE = 'rx_session';
const STAFF = new Set(['admin', 'finance', 'security']);

/* ---- persistence ---------------------------------------------------------- */

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'rootx.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, updated_at INTEGER NOT NULL)');
const saveStmt = db.prepare('INSERT INTO state (id, json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at');
const loadStmt = db.prepare('SELECT json FROM state WHERE id = 1');

let saveTimer: NodeJS.Timeout | null = null;
function persist(state: AppState) {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      saveStmt.run(JSON.stringify(state), Date.now());
    } catch (e) {
      console.error('[persist] failed:', e);
    }
  }, 250);
}

/* ---- state ---------------------------------------------------------------- */

function freshState(): AppState {
  const s = init();
  return serverize(s);
}

/** Apply server-mode invariants: no simulation; sim riders parked; active
 *  runs reassigned to the real rider so a human session can drive them. */
function serverize(s: AppState): AppState {
  const real = s.riders.find((r) => r.userId && !r.simulated);
  return {
    ...s,
    simEnabled: false,
    session: { userId: null, mfaFor: null },
    otp: null,
    riders: s.riders.map((r) => (r.simulated ? { ...r, isAvailable: false } : r)),
    deliveries: s.deliveries.map((d) => {
      const rider = d.riderId ? s.riders.find((r) => r.id === d.riderId) : null;
      if (rider?.simulated && real && !['delivered', 'cancelled', 'disputed', 'under_review', 'return_required'].includes(d.status)) {
        return {
          ...d,
          riderId: real.id,
          statusHistory: [...d.statusHistory, { status: d.status, at: s.clock.epoch, note: 'Reassigned to the on-duty verified rider', actorId: 'system' }],
        };
      }
      return d;
    }),
  };
}

let state: AppState = (() => {
  const row = loadStmt.get() as { json: string } | undefined;
  if (row) {
    try {
      const parsed = JSON.parse(row.json) as AppState;
      if (parsed.version === 1) return serverize({ ...parsed, topups: parsed.topups ?? [] });
    } catch (e) {
      console.error('[boot] corrupt state, reseeding:', e);
    }
  }
  return freshState();
})();

/* ---- sessions --------------------------------------------------------------- */

interface Session {
  userId: string | null;
  mfaFor: string | null;
}
const sessions = new Map<string, Session>(); // token → session (memory; prototype scope, see docs/10)

function newToken(): string {
  return randomBytes(24).toString('hex');
}

function viewerOf(req: { cookies: Record<string, string | undefined> }): Session {
  const token = req.cookies[COOKIE];
  return (token ? sessions.get(token) : undefined) ?? { userId: null, mfaFor: null };
}

function userOf(s: AppState, id: string | null | undefined): UserAccount | undefined {
  return id ? s.users.find((u) => u.id === id) : undefined;
}

function isStaff(u: UserAccount | undefined): boolean {
  return !!u && STAFF.has(u.role);
}

/* ---- redaction (per-viewer) ---------------------------------------------------
   The browser gets exactly what its session is entitled to — enforced here,
   not by hiding UI (C-7). Staff (admin/finance/security) see operational
   detail; participants see their own context; everybody else gets the
   anonymised minimum the live map needs. ------------------------------------ */

function viewerView(s: AppState, sess: Session, opts: { includeOtp?: boolean } = {}): AppState {
  const me = userOf(s, sess.userId);
  const staff = isStaff(me);
  const myRiderId = me ? (s.riders.find((r) => r.userId === me.id)?.id ?? null) : null;

  const deliveries = s.deliveries.map((d) => {
    const participant = me && (d.customerId === me.id || d.riderId === myRiderId);
    const privileged = staff || participant;
    return {
      ...d,
      pickupCode: privileged ? d.pickupCode : null,
      deliveryCode: privileged ? d.deliveryCode : null,
      trackingToken: privileged ? d.trackingToken : { token: '', expiresAt: d.trackingToken.expiresAt, revoked: d.trackingToken.revoked },
      quote: privileged ? d.quote : null,
      payment: privileged ? d.payment : null,
      riderLocation: privileged ? d.riderLocation : null,
      stops: d.stops.map((st) => ({ ...st, receiver: privileged ? st.receiver : null })),
    } as Delivery;
  });

  return {
    ...s,
    session: { userId: sess.userId, mfaFor: sess.mfaFor },
    otp: opts.includeOtp ? s.otp : null,
    deliveries,
    notifications: s.notifications.filter((n) => staff || n.userId === null || (me != null && n.userId === me.id)),
    auditLog: staff ? s.auditLog : [],
    batches: staff ? s.batches : [],
    applications: staff ? s.applications : [],
    incidents: staff ? s.incidents : s.incidents.filter((i) => me != null && i.riderId === myRiderId),
    disputes: staff ? s.disputes : s.disputes.filter((c) => deliveries.some((d) => d.id === c.deliveryId && d.customerId === me?.id)),
    payouts: staff ? s.payouts : s.payouts.filter((p) => p.riderId === myRiderId),
    riders: s.riders.map((r) => ({
      ...r,
      pendingEarnings: staff || r.id === myRiderId ? r.pendingEarnings : 0,
      availableEarnings: staff || r.id === myRiderId ? r.availableEarnings : 0,
      location: staff || r.id === myRiderId ? r.location : null,
      locationUpdatedAt: staff || r.id === myRiderId ? r.locationUpdatedAt : null,
    })),
    users: s.users.map((u) =>
      staff || u.id === me?.id
        ? u
        : { ...u, phone: '', walletBalance: 0, savedLocations: [] },
    ),
    topups: staff ? s.topups : s.topups.filter((t) => me != null && t.userId === me.id),
    networkQueue: [],
  };
}

/* ---- serialization + broadcast ------------------------------------------------ */

let chain: Promise<void> = Promise.resolve();
function enqueue(run: () => void) {
  chain = chain.then(run).catch((e) => console.error('[action] failed:', e));
}

interface Conn {
  sess: Session;
  send: (data: string) => void;
}
const conns = new Set<Conn>();

function broadcast(full: boolean) {
  if (!full) {
    const msg = JSON.stringify({ type: 'clock', epoch: state.clock.epoch });
    for (const c of conns) c.send(msg);
    return;
  }
  // one serialization per distinct viewer (usually 1–3 in a demo session)
  const cache = new Map<string, string>();
  for (const c of conns) {
    const key = `${c.sess.userId}|${c.sess.mfaFor}`;
    let payload = cache.get(key);
    if (!payload) {
      payload = JSON.stringify({ type: 'state', state: viewerView(state, c.sess) });
      cache.set(key, payload);
    }
    c.send(payload);
  }
}

function significantChange(before: AppState, after: AppState): boolean {
  const strip = (s: AppState) => JSON.stringify({ ...s, clock: { epoch: 0, speed: 1 } });
  return strip(before) !== strip(after);
}

/* ---- server ------------------------------------------------------------------ */

const app = Fastify({ logger: { level: 'warn' } });
void app.register(cookie, {});

const api = async () => {
  /* action relay — the ONLY way state changes (besides the server clock) */
  app.post<{ Body: Action }>('/api/action', async (req, reply) => {
    const action = req.body;
    if (!action || typeof action.type !== 'string') return reply.code(400).send({ error: 'bad action' });
    const sess = viewerOf(req);
    const result = await new Promise<{ state: AppState }>((resolve) => {
      enqueue(() => {
        // actor injection: the reducer sees THIS session as state.session
        const isAuth = action.type.startsWith('auth/');
        const injected: AppState = isAuth
          ? { ...state, session: { userId: null, mfaFor: sess.mfaFor } }
          : { ...state, session: { userId: sess.userId, mfaFor: null } };
        const next = reducer(injected, action);
        if (next === injected) {
          resolve({ state: viewerView(state, sess) }); // rejected by the rules — no change, and still viewer-redacted
          return;
        }
        if (isAuth) {
          const ns = next.session;
          if (ns.userId || ns.mfaFor) {
            const token = newToken();
            sessions.set(token, { userId: ns.userId, mfaFor: ns.mfaFor });
            void reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/' });
            state = { ...next, session: { userId: null, mfaFor: null }, otp: action.type === 'auth/otpRequest' ? next.otp : null };
            if (action.type !== 'auth/otpRequest') broadcast(false);
            persist(state);
            resolve({ state: viewerView(state, sessions.get(token)!, { includeOtp: action.type === 'auth/otpRequest' }) });
            return;
          }
          if (action.type === 'auth/logout' || action.type === 'auth/otpVerify' || action.type === 'auth/mfaVerify') {
            const token = req.cookies[COOKIE];
            if (token) sessions.delete(token);
            void reply.clearCookie(COOKIE, { path: '/' });
          }
          // keep a pending OTP across otpRequest and failed verifies (attempt
          // counters drive the lockout); clear it on logout / other outcomes.
          const keepOtp = action.type === 'auth/otpRequest' || (action.type === 'auth/otpVerify' && next.session.userId === null);
          state = { ...next, session: { userId: null, mfaFor: null }, otp: keepOtp ? next.otp : null };
          persist(state);
          resolve({ state: viewerView(state, { userId: null, mfaFor: null }, { includeOtp: action.type === 'auth/otpRequest' }) });
          return;
        }
        state = action.type === 'app/reset' ? serverize(next) : next;
        persist(state);
        broadcast(true);
        resolve({ state: viewerView(state, sess) });
      });
    });
    return result;
  });

  /* current state for the caller's session */
  app.get('/api/state', async (req) => {
    return { state: viewerView(state, viewerOf(req)) };
  });

  /* server clock + change stream */
  app.get('/api/events', (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const conn: Conn = {
      sess: viewerOf(req),
      send: (data) => reply.raw.write(`data: ${data}\n\n`),
    };
    conns.add(conn);
    conn.send(JSON.stringify({ type: 'state', state: viewerView(state, conn.sess) }));
    const hb = setInterval(() => reply.raw.write(': heartbeat\n\n'), 15_000);
    req.raw.on('close', () => {
      clearInterval(hb);
      conns.delete(conn);
    });
  });

  /* guest tracking — token in, minimal delivery-scoped view out (C-4) */
  app.get('/api/guest/:token', (req, reply) => {
    const { token } = req.params as { token: string };
    const d = state.deliveries.find((x) => x.trackingToken.token === token);
    if (!d || d.trackingToken.revoked || state.clock.epoch > d.trackingToken.expiresAt) {
      return reply.code(404).send({ error: 'not found' });
    }
    const rider = d.riderId ? state.riders.find((r) => r.id === d.riderId) : null;
    const riderUser = rider?.userId ? userOf(state, rider.userId) : null;
    const last = riderUser?.name?.split(' ') ?? [];
    return {
      ref: d.ref,
      status: d.status,
      statusHistory: d.statusHistory.map((h) => ({ status: h.status, at: h.at })),
      stops: d.stops.map((s) => ({ kind: s.kind, label: s.label, x: s.x, y: s.y, zoneId: s.zoneId })),
      route: d.route,
      riderLocation: d.riderLocation,
      riderProgress: d.riderProgress,
      riderFirstName: last[0] ?? 'Rider',
      riderVehicle: rider?.transport ?? null,
      deliveryCode: d.deliveryCode,
      package: { category: d.package.category, fragile: d.package.fragile, food: d.package.food },
      expiresAt: d.trackingToken.expiresAt,
      epoch: state.clock.epoch,
    };
  });

  /* demo reset */
  app.post('/api/dev/reset', async (req, reply) => {
    enqueue(() => {
      state = freshState();
      persist(state);
      broadcast(true);
    });
    return { ok: true };
  });
};
void api();

/* ---- compiled app (PWA) -------------------------------------------------------- */
/* Serves ../app/dist when it exists: one origin serves the installed app and
 * its API. /api routes always win (registered paths); everything else falls
 * through to files, and unknown paths get the SPA shell — except /api misses,
 * which stay JSON 404s. */
const DIST = join(__dirname, '..', '..', 'app', 'dist');
if (existsSync(DIST)) {
  app.get('/sw.js', (_req, reply) => {
    reply.header('cache-control', 'no-cache').sendFile('sw.js');
  });
  app.get('/manifest.webmanifest', (_req, reply) => {
    reply.header('content-type', 'application/manifest+json').header('cache-control', 'no-cache').sendFile('manifest.webmanifest');
  });
  void app.register(fastifyStatic, {
    root: DIST,
    prefix: '/',
    cacheControl: false,
  });
  // SPA fallback: missed paths (deep links like /login, /track/…) get the
  // shell; /api misses stay JSON 404s.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
      return reply.code(404).send({ error: 'not found' });
    }
    reply.header('cache-control', 'no-cache').sendFile('index.html');
  });
  console.log(`app shell: ${DIST}`);
} else {
  console.log('app shell: not built (run npm run build in ../app) — serving API only');
}

/* ---- server clock ------------------------------------------------------------ */

setInterval(() => {
  enqueue(() => {
    const before = state;
    const next = reducer(state, { type: 'tick' });
    if (next === before) return;
    state = next;
    const significant = significantChange(before, next);
    persist(state);
    broadcast(!significant ? false : true);
  });
}, TICK_MS);

/* ---- lifecycle ---------------------------------------------------------------- */

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    try {
      saveStmt.run(JSON.stringify(state), Date.now());
      db.close();
    } finally {
      process.exit(0);
    }
  });
}

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`ROOT-X on :${PORT} · app: ${existsSync(DIST) ? 'compiled PWA' : 'API only'} · riders:human-driven · persistence: SQLite (${join(DATA_DIR, 'rootx.db')})`);
});
