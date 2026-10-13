import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, MessageSquare, ShieldAlert } from 'lucide-react';
import { Banner, Card } from '../../ds';
import { useRootX, currentUser } from '../../engine/store';
import { fmtDay, fmtTime } from '../../components/bits';

export default function Support() {
  const state = useRootX();
  const user = currentUser(state)!;
  const now = state.clock.epoch;
  const myCases = state.disputes.filter((c) => c.openedBy === user.id);

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1>Support</h1>

      <Card className="stack-sm">
        <div className="row" style={{ gap: 12 }}>
          <LifeBuoy size={22} style={{ color: 'var(--root-700)' }} />
          <div>
            <strong>How ROOT-X support works</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Every case gets a human review using verification records, package photos, timestamps and route history. Reports never
              trigger automatic penalties — riders and customers can respond and appeal.
            </p>
          </div>
        </div>
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Your cases</div>
        {myCases.length === 0 ? (
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            No cases. Report a problem from any delivery's detail screen — or check the <Link to="/deliveries">disputed example</Link> seeded for the demo (log in as Tunde).
          </p>
        ) : (
          myCases.map((c) => (
            <div key={c.id} className="stack-sm" style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: 10 }}>
              <div className="row-between">
                <span className="mono" style={{ fontWeight: 700 }}>{c.id.toUpperCase()}</span>
                <span className={`pill ${c.status === 'resolved' ? 'pill-go' : c.status === 'under_review' ? 'pill-wait' : 'pill-hold'}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{c.reason}</div>
              <div className="faint" style={{ fontSize: 'var(--text-xs)' }}>Opened {fmtDay(c.openedAt, now)} {fmtTime(c.openedAt)}</div>
              {c.resolution && (
                <Banner tone="success">
                  {c.resolution.outcome}
                  {c.resolution.refundAmount > 0 && <> — refunded ₦{c.resolution.refundAmount.toLocaleString()} to wallet.</>}
                </Banner>
              )}
            </div>
          ))
        )}
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Safety &amp; emergencies</div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          In immediate danger, contact local emergency services first (Nigeria: 112). Riders have an in-app SOS during active
          deliveries; senders and receivers can report safety issues on any delivery.
        </p>
        <Banner tone="info" icon={ShieldAlert}>
          Emergency reporting stays available even outside service hours.
        </Banner>
      </Card>

      <Card className="stack-sm">
        <div className="data-label">FAQ</div>
        {[
          ['Why can’t I book after ~8 PM?', 'The 9 PM closure protects students. Bookings must finish before closing — the app suggests a morning slot instead.'],
          ['Why wasn’t my rider shown my number?', 'Calls and chats are masked in production. Your phone number is private.'],
          ['What can’t I send?', 'Illegal, dangerous or prohibited items — including alcohol, tobacco, weapons, drugs and large cash. Riders may refuse at pickup.'],
          ['Do you insure packages?', 'No insurance is offered unless coverage is confirmed in writing. High-value rules and claim deadlines are in the delivery terms.'],
        ].map(([q, a]) => (
          <details key={q} style={{ borderBottom: '1px solid var(--line-subtle)', padding: '8px 0' }}>
            <summary style={{ fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>{q}</summary>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>{a}</p>
          </details>
        ))}
      </Card>
    </div>
  );
}
