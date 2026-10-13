/* ROOT-X end-to-end over real HTTP — two human sessions + server clock.
 * Run: node scripts/e2e.mjs  (server must be on :4000) */
const BASE = 'http://localhost:4000';

class Session {
  constructor(name) {
    this.name = name;
    this.cookie = '';
  }
  async call(path, method = 'GET', body) {
    const r = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = r.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  }
  action(a) {
    return this.call('/api/action', 'POST', a);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dOf = (s, id) => s.json.state.deliveries.find((d) => d.id === id);

let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? '✓' : '✗ FAIL'} — ${name}${extra ? ' [' + extra + ']' : ''}`);
  if (!cond) failures++;
}

async function waitFor(sess, pred, what, timeoutMs = 30000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeoutMs) {
    last = await sess.call('/api/state');
    if (pred(last)) return last;
    await sleep(1000);
  }
  console.log('  timeout waiting for:', what, '— last status:', last ? '(see state)' : 'n/a');
  return last;
}

/** deterministic runs: reset to the seeded world first */
{
  const r = await fetch(BASE + '/api/dev/reset', { method: 'POST' });
  if (r.ok) console.log('✓ — state reset to seed');
  await sleep(1500); // let the first ticks settle
}

const ada = new Session('ada (customer)');
const chidi = new Session('chidi (rider)');
const finance = new Session('finance');
const admin = new Session('admin');

/* 1 — anonymous state is redacted */
{
  const anon = new Session('anon');
  const s = await anon.call('/api/state');
  check('anonymous state loads', s.status === 200);
  check('anonymous sees no OTP secrets', s.json.state.otp === null);
  check('anonymous sees no admin audit log', s.json.state.auditLog.length === 0);
  check('anonymous sees no pickup codes', s.json.state.deliveries.every((d) => d.pickupCode === null));
}

/* 1b — real OTP sign-in: code returns to the requester only */
{
  const req = await ada.action({ type: 'auth/otpRequest', phone: '0803 111 0001' });
  const otp = req.json.state.otp;
  check('otpRequest returns the code to the requester', !!otp?.code && otp.pendingUserId === 'u-ada');
  const wrong = await ada.action({ type: 'auth/otpVerify', code: '000000' });
  check('wrong OTP does not log in', wrong.json.state.session.userId === null);
  const okLogin = await ada.action({ type: 'auth/otpVerify', code: otp.code });
  check('correct OTP logs in (real auth path)', okLogin.json.state.session.userId === 'u-ada' && okLogin.json.state.otp === null);
  // registration creates a real account
  const reg = new Session('funke (new registration)');
  const r1 = await reg.action({ type: 'auth/otpRequest', phone: '0803 777 4321', registering: { name: 'Funke Adeleke', zoneId: 'osogbo-campus' } });
  const r2 = await reg.action({ type: 'auth/otpVerify', code: r1.json.state.otp.code });
  const me = r2.json.state.users.find((u) => u.id === r2.json.state.session.userId);
  check('registration creates a real customer account', !!me && me.role === 'customer' && me.name === 'Funke Adeleke');
}

/* 2 — customer books */
{
  const login = await ada.action({ type: 'auth/quickLogin', userId: 'u-ada' });
  check('Ada logs in', login.json.state.session.userId === 'u-ada');
  const before = login.json.state.deliveries.length;

  const created = await ada.action({
    type: 'delivery/create',
    input: {
      kind: 'immediate',
      scheduledFor: null,
      stops: [
        { id: 'st-p1', kind: 'pickup', label: 'Main library', x: 230, y: 180, zoneId: 'osogbo-campus' },
        { id: 'st-d1', kind: 'dropoff', label: 'Hostel Block A', x: 350, y: 240, zoneId: 'osogbo-campus', receiver: { name: 'Ada (self)', phone: '0803 111 0001' } },
      ],
      pkg: {
        description: 'Borrowed textbooks',
        category: 'documents',
        quantity: 1,
        weightKg: 2,
        dimensions: { l: 30, w: 22, h: 8 },
        sizeTier: 'small',
        photos: ['data:image/svg+xml;placeholder'],
        contentsDeclared: true,
        handlingNotes: 'Library books — keep dry.',
        fragile: false,
        food: false,
        declaredValue: null,
      },
      transport: 'bicycle',
    },
  });
  const list = created.json.state.deliveries;
  check('delivery created', list.length === before + 1);
  globalThis.dId = list[list.length - 1].id;
  check('starts awaiting_payment', dOf(created, dId).status === 'awaiting_payment');
  check('sender can see her pickup code', typeof dOf(created, dId).pickupCode === 'string');

  const paid = await ada.action({ type: 'delivery/pay', deliveryId: dId, method: 'card' });
  check('payment is processing (never instantly success)', dOf(paid, dId).status === 'payment_processing');

  const done = await waitFor(ada, (s) => ['awaiting_rider', 'offered_to_riders', 'rider_assigned'].includes(dOf(s, dId).status), 'gateway webhook + auto-offer');
  check('webhook verified payment → offered to riders', dOf(done, dId).payment?.status === 'succeeded' && dOf(done, dId).status === 'offered_to_riders', dOf(done, dId).status);
}

/* 3 — real rider session drives the run */
{
  const login = await chidi.action({ type: 'auth/quickLogin', userId: 'u-chidi' });
  check('Chidi (rider) logs in', login.json.state.session.userId === 'u-chidi');

  // security: rider must NOT see the codes
  const riderView = dOf(login, dId);
  check('rider cannot read the pickup code', riderView.pickupCode === null && riderView.deliveryCode === null);

  const acc = await chidi.action({ type: 'delivery/accept', deliveryId: dId, riderId: login.json.state.riders.find((r) => r.userId === 'u-chidi').id });
  check('rider accepts the offer', dOf(acc, dId).status === 'rider_assigned');

  for (const step of ['approach', 'arrive_pickup', 'request_pickup_code']) {
    await chidi.action({ type: 'delivery/riderAction', deliveryId: dId, action: step });
  }
  let s = await chidi.call('/api/state');
  check('rider at pickup-verification stage', dOf(s, dId).status === 'pickup_verification_pending', dOf(s, dId).status);

  // wrong code first — lockout counters are real
  const wrong = await chidi.action({ type: 'delivery/verifyCode', deliveryId: dId, kind: 'pickup', code: '0000', by: 'rider' });
  check('wrong code does not advance', dOf(wrong, dId).status === 'pickup_verification_pending');

  // Ada (sender) reads her code and shares it with the rider
  const adaState = await ada.call('/api/state');
  const code = dOf(adaState, dId).pickupCode;
  const ok = await chidi.action({ type: 'delivery/verifyCode', deliveryId: dId, kind: 'pickup', code, by: 'rider' });
  check('correct pickup code advances', dOf(ok, dId).status === 'package_collected', dOf(ok, dId).status);

  for (const step of ['depart', 'approach_dest', 'arrive_dest', 'request_delivery_code']) {
    await chidi.action({ type: 'delivery/riderAction', deliveryId: dId, action: step });
  }
  s = await chidi.call('/api/state');
  check('delivery-verification stage', dOf(s, dId).status === 'delivery_verification_pending', dOf(s, dId).status);

  const dcode = dOf(await ada.call('/api/state'), dId).deliveryCode;
  const fin = await chidi.action({ type: 'delivery/verifyCode', deliveryId: dId, kind: 'delivery', code: dcode, by: 'rider' });
  check('delivery code completes the run', dOf(fin, dId).status === 'delivered', dOf(fin, dId).status);
  const readyState = await waitFor(chidi, (s) => dOf(s, dId).ledger?.settlement === 'ready', 'ledger ready');
  check('ledger built and ready', dOf(readyState, dId).ledger?.settlement === 'ready');
  const l = dOf(readyState, dId).ledger;
  check('ledger invariant holds', l.charge - l.gatewayFee - l.commission - l.adjustments.reduce((a, x) => a + x.amount, 0) - l.refunded === l.riderNet);
}

/* 4 — two-person settlement */
{
  const f = await finance.action({ type: 'auth/quickLogin', userId: 'u-finance' });
  check('finance session', f.json.state.session.userId === 'u-finance');
  const run = await finance.action({ type: 'admin/settlementRun' });
  const batch = run.json.state.batches[0];
  check('finance proposes settlement batch', !!batch && batch.status === 'awaiting_approval');

  const selfApprove = await finance.action({ type: 'admin/approveSettlement', batchId: batch.id });
  check('finance CANNOT approve own batch', selfApprove.json.state.batches[0].status === 'awaiting_approval');

  const a = await admin.action({ type: 'auth/quickLogin', userId: 'u-admin' });
  check('admin session', a.json.state.session.userId === 'u-admin');
  const approved = await admin.action({ type: 'admin/approveSettlement', batchId: batch.id });
  check('admin approves — riders paid', approved.json.state.batches[0].status === 'approved');
  check('audit trail has both actors', approved.json.state.auditLog.some((x) => x.action === 'settlement.run') && approved.json.state.auditLog.some((x) => x.action === 'settlement.approve'));
}

/* 4b — wallet top-up runs the real gateway lifecycle */
{
  const bal = (s) => s.json.state.users.find((u) => u.id === 'u-ada').walletBalance;
  const s0 = await ada.call('/api/state');
  const before = bal(s0);
  const tu = await ada.action({ type: 'wallet/topUp', amount: 5000, method: 'card' });
  check('top-up starts processing (never instantly credited)', tu.json.state.topups.some((x) => x.userId === 'u-ada' && x.status === 'processing') && bal(tu) === before);

  const credited = await waitFor(ada, (s) => bal(s) === before + 5000, 'top-up webhook');
  check('webhook credits the wallet exactly once', bal(credited) === before + 5000);

  // rejected actions must return a viewer-redacted view, never raw state
  const intruder = new Session('intruder (anonymous)');
  const probe = await intruder.action({ type: 'delivery/cancel', deliveryId: dId, reason: 'hostile', by: 'u-ada', actorName: 'Ada' });
  check('rejected action response is viewer-redacted', probe.json.state.auditLog.length === 0 && probe.json.state.batches.length === 0 && probe.json.state.deliveries.every((x) => x.pickupCode === null));
  check('cancel did not go through', dOf(probe, dId).status === 'delivered');

  // notification prefs persist
  const pref = await ada.action({ type: 'user/notifyPref', channel: 'email', value: false });
  check('notification pref saved', pref.json.state.users.find((u) => u.id === 'u-ada').notifyPrefs.email === false);
}

/* 5 — guest link works cross-session, redacted */
{
  const s = await ada.call('/api/state');
  const tok = dOf(s, dId)?.trackingToken?.token;
  const seeded = s.json.state.deliveries.find((x) => x.trackingToken?.token && x.id !== dId);
  const token = tok || seeded.trackingToken.token;
  const r = await fetch(`${BASE}/api/guest/${token}`);
  const g = await r.json();
  check('guest link resolves', r.status === 200 && !!g.ref);
  check('guest view has delivery code but no phones', typeof g.deliveryCode === 'string' && !JSON.stringify(g).includes('"phone"'));
  const r2 = await fetch(`${BASE}/api/guest/definitely-not-a-token`);
  check('bogus token 404s', r2.status === 404);
}

console.log(failures === 0 ? '\nE2E PASS — fully functional, human-driven, server-authoritative' : `\nE2E FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
