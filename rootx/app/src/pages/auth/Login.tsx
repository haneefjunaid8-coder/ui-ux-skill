import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Bike, Clock, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { Banner, Button, CodeInput, Field, Select, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, serviceWindowNow } from '../../engine/store';
import { ServiceStatusChip } from '../../components/bits';

/* ============================================================================
   Login — phone + OTP (Nigerian-context default), seeded accounts,
   registration, staff MFA and guest tracking entry. The OTP code is returned
   by the auth/otpRequest response (no SMS gateway is wired — docs/19 U-8),
   so it is kept in local state; the SSE stream re-redacts it.
   ========================================================================== */

const DEMO_ACCOUNTS = [
  { id: 'u-ada', name: 'Ada Obi', role: 'Customer', note: 'Active delivery in transit' },
  { id: 'u-tunde', name: 'Tunde Bakare', role: 'Customer', note: 'Has a disputed case' },
  { id: 'u-chidi', name: 'Chidi Okafor', role: 'Student rider', note: 'Approved · motorcycle' },
  { id: 'u-amaka', name: 'Amaka Eze', role: 'Rider applicant', note: 'Apply + review flow' },
  { id: 'u-admin', name: 'Mrs. Bello', role: 'Ops admin', note: 'MFA on · reviews & config' },
  { id: 'u-finance', name: 'Mr. Adeyemi', role: 'Finance', note: 'MFA on · settlement runs' },
];

export default function Login() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'register' | 'otp' | 'mfa'>('signin');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regZone, setRegZone] = useState('osogbo-campus');
  const [code, setCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [otpInfo, setOtpInfo] = useState<{ phone: string; code: string | null } | null>(null);

  const window = serviceWindowNow(state);
  const user = state.users.find((u) => u.id === selected);

  async function sendCode() {
    let phone: string | null = null;
    if (mode === 'register') {
      if (!regName.trim() || !regPhone.trim()) return toast('Enter your name and phone number.', 'warn');
      if (!terms) return toast('Please accept the terms and privacy notice.', 'warn');
      phone = regPhone.trim();
    } else if (user) {
      phone = user.phone;
    }
    if (!phone) return;

    const res = await dispatch({ type: 'auth/otpRequest', phone, ...(mode === 'register' ? { registering: { name: regName.trim(), zoneId: regZone } } : {}) });
    // the code comes back on this response only; keep a local copy because
    // the SSE stream redacts it again on the next broadcast
    const otp = res?.state?.otp ?? null;
    setOtpInfo(otp ? { phone: otp.phone, code: otp.code } : { phone, code: null });
    setCode('');
    setMode('otp');
    if (res) toast('Verification code sent.');
    else toast('You are offline — the code will be requested when the connection returns.', 'warn');
  }

  async function verify() {
    if (code.length < 6) return;
    const res = await dispatch({ type: 'auth/otpVerify', code });
    if (res && !res.state?.session.userId && !res.state?.session.mfaFor) {
      toast('That code did not match. Check the digits and try again.', 'warn');
      setCode('');
    }
  }

  React.useEffect(() => {
    if (state.session.mfaFor) setMode('mfa');
    if (state.session.userId) {
      const u = state.users.find((x) => x.id === state.session.userId);
      if (u?.role === 'admin' || u?.role === 'finance') navigate('/admin');
      else if (u?.role === 'rider') navigate('/rider');
      else navigate('/home');
    }
  }, [state.session, state.users, navigate]);

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: '1fr' }}>
      <style>{`@media (min-width: 960px){ .login-grid{grid-template-columns: 1.05fr 1fr !important} }`}</style>
      <div className="login-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', minHeight: '100dvh' }}>
        {/* left brand panel */}
        <aside
          className="login-aside-wrap stack-lg"
          style={{
            flexDirection: 'column',
            padding: 'clamp(32px, 4vw, 64px)',
            background: 'radial-gradient(900px 480px at 20% -10%, oklch(0.95 0.03 60 / 0.45), transparent 60%), linear-gradient(165deg, oklch(0.985 0.002 250), oklch(0.94 0.003 250))',
            borderRight: '1px solid var(--line-subtle)',
          }}
        >
          <Logo />
          <h1 style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.025em', maxWidth: '20ch', marginTop: 8 }}>
            Campus delivery, <span style={{ color: 'var(--root-700)' }}>by verified UNIOSUN students</span>.
          </h1>
          <p style={{ maxWidth: '48ch', color: 'var(--ink-2)', fontSize: 'var(--text-md)', lineHeight: 1.65 }}>
            ROOT-X connects senders and receivers inside approved campus and student-township zones — with rider verification,
            pickup &amp; delivery codes, and safety hours that keep everyone off the road after 9&nbsp;PM.
          </p>
          <div className="stack" style={{ marginTop: 'auto', gap: 14 }}>
            {[
              { icon: ShieldCheck, t: 'Student-only riders', d: 'Matric number, student ID upload and manual approval before anyone carries a package.' },
              { icon: KeyRound, t: 'Verified handovers', d: 'Pickup and delivery codes with attempt limits. No code, no handover.' },
              { icon: Clock, t: '6 PM notice · 9 PM close', d: 'A core operating rule enforced by the matching engine — not a decoration.' },
            ].map((f) => (
              <div key={f.t} className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                <span style={{ color: 'var(--root-300)', flexShrink: 0, background: 'var(--root-950)', borderRadius: 10, padding: 8, display: 'flex' }}>
                  <f.icon size={20} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>{f.t}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="faint" style={{ fontSize: 'var(--text-xs)', maxWidth: '60ch' }}>
            Working prototype · demo data only · no real payments. Colours, fares and policies are documented defaults pending
            founder approval. No affiliation with UNIOSUN is claimed unless formally confirmed.
          </p>
        </aside>

        {/* right auth panel */}
        <main style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 4vw, 48px)', gap: 18, maxWidth: 620, marginInline: 'auto', width: '100%', justifyContent: 'center' }}>
          <div className="row-between login-mobile-logo" style={{ gap: 12 }}>
            <Logo />
            <ServiceStatusChip phase={window.phase} time={fmtClock(state.clock.epoch)} />
          </div>

          {window.phase !== 'open' && (
            <Banner tone={window.phase === 'closed' ? 'danger' : 'warn'} title="Safety hours">
              {window.message}
            </Banner>
          )}

          <div className="card card-pad-lg stack">
            {mode === 'signin' && (
              <>
                <div>
                  <h2>Sign in</h2>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Choose an account to continue, or register below.</p>
                </div>
                <div className="stack-sm" role="list" aria-label="Accounts">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.id}
                      className="radio-card"
                      data-selected={selected === a.id}
                      aria-pressed={selected === a.id}
                      onClick={() => setSelected(a.id)}
                    >
                      <span className="radio-dot" aria-hidden="true" />
                      <span className="grow">
                        <span className="row-between" style={{ gap: 8 }}>
                          <span style={{ fontWeight: 700 }}>{a.name}</span>
                          <span className="pill pill-hold">{a.role}</span>
                        </span>
                        <span className="muted" style={{ fontSize: 'var(--text-sm)', display: 'block' }}>{a.note}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <Button block size="lg" icon={Smartphone} disabled={!selected} onClick={sendCode}>
                  Continue with phone verification
                </Button>
                <div className="route-divider" role="separator" />
                <Button variant="secondary" block onClick={() => setMode('register')}>
                  Register as a sender
                </Button>
                <GuestLinkEntry />
              </>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <h2>Register</h2>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Phone-first signup for the UNIOSUN community. Location eligibility is checked when you book. Riders apply separately after signing up.</p>
                </div>
                <Field label="Full name" required htmlFor="reg-name">
                  <TextInput id="reg-name" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Funke Adeleke" autoComplete="name" />
                </Field>
                <Field label="Phone number" required htmlFor="reg-phone" hint="A one-time code will be sent by SMS.">
                  <TextInput id="reg-phone" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="0803 000 0000" inputMode="tel" autoComplete="tel" />
                </Field>
                <Field label="Your campus area" required htmlFor="reg-zone" hint="Used for zone eligibility and landmark search.">
                  <Select id="reg-zone" value={regZone} onChange={(e) => setRegZone(e.target.value)}>
                    <option value="osogbo-campus">Osogbo (Main) Campus</option>
                    <option value="oke-baale">Oke-Baale Student Township</option>
                    <option value="ikire-campus">Ikire Campus</option>
                    <option value="ifetedo-campus">Ifetedo Campus</option>
                    <option value="ipetu-campus">Ipetu-Ijesa Campus</option>
                    <option value="ejigbo-campus">Ejigbo Campus</option>
                  </Select>
                </Field>
                <label className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17, accentColor: 'var(--root-600)' }} />
                  <span>
                    I accept the ROOT-X terms, privacy notice and campus delivery rules. I understand prohibited items are
                    not allowed and location is used only for delivery purposes.
                  </span>
                </label>
                <Button block size="lg" icon={ArrowRight} onClick={sendCode}>Send verification code</Button>
                <Button variant="ghost" block onClick={() => setMode('signin')}>Back to sign in</Button>
              </>
            )}

            {mode === 'otp' && (
              <>
                <div>
                  <h2>Verify your phone</h2>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Enter the 6-digit code sent to <strong className="mono">{otpInfo?.phone}</strong>.
                  </p>
                </div>
                {otpInfo?.code ? (
                  <Banner tone="info" icon={Bike}>
                    No SMS gateway is wired into this prototype, so your code is shown here:{' '}
                    <strong className="mono" style={{ fontSize: 'var(--text-md)', letterSpacing: '0.15em' }}>{otpInfo.code}</strong>
                    . Requests are rate-limited and attempts are limited.
                  </Banner>
                ) : (
                  <Banner tone="warn" icon={Bike}>
                    Your code will be requested as soon as the connection returns — nothing is sent yet.
                  </Banner>
                )}
                <CodeInput label="Verification code" value={code} onChange={setCode} />
                <Button block size="lg" onClick={verify} disabled={code.length < 6}>Verify</Button>
                <Button variant="ghost" block onClick={() => setMode('signin')}>Back</Button>
              </>
            )}

            {mode === 'mfa' && (
              <>
                <div>
                  <h2>Staff sign-in · step 2</h2>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Privileged accounts require multi-factor authentication.</p>
                </div>
                <Banner tone="info" icon={KeyRound}>
                  Staff authenticator code for this prototype: <strong className="mono">314159</strong> (a real TOTP secret is provisioned per staff account in production)
                </Banner>
                <CodeInput label="Authenticator code" value={code} onChange={setCode} length={6} />
                <Button block size="lg" onClick={() => dispatch({ type: 'auth/mfaVerify', code })} disabled={code.length < 6}>
                  Verify and continue
                </Button>
              </>
            )}
          </div>

          <p className="faint" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
            Prototype · all data is fictional · <Link to="/track/track-demo-active">open a sample tracking link</Link>.
          </p>
        </main>
      </div>
    </div>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14.5" fill="var(--root-50)" stroke="var(--root-600)" strokeWidth="1.6" />
        <path d="M9 9 C 13 13, 13 19, 9 23" stroke="var(--root-600)" strokeWidth="2.4" fill="none" strokeDasharray="2.5 3.5" strokeLinecap="round" />
        <path d="M23 9 C 19 13, 19 19, 23 23" stroke="var(--root-600)" strokeWidth="2.4" fill="none" strokeDasharray="2.5 3.5" strokeLinecap="round" />
        <path d="M16 6 L16 26 M6 16 L26 16" stroke="var(--dusk-500)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3.4" />
      </svg>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.72, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        ROOT<span style={{ color: 'var(--root-700)' }}>-X</span>
      </span>
    </span>
  );
}

function GuestLinkEntry() {
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  return (
    <form
      className="stack-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (token.trim()) navigate('/track/' + token.trim());
      }}
    >
      <div className="field-label" style={{ marginTop: 8 }}>
        Have a tracking link? (receiver / guest)
      </div>
      <div className="row">
        <TextInput value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. from a sharing link" aria-label="Tracking token" />
        <Button variant="secondary" type="submit">Open</Button>
      </div>
    </form>
  );
}

function fmtClock(epoch: number): string {
  return new Date(epoch).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}
