import React from 'react';
import { FileClock } from 'lucide-react';
import { Banner, Card } from '../../ds';
import { useRootX } from '../../engine/store';
import { fmtDay, fmtTime } from '../../components/bits';

export default function AdminAudit() {
  const state = useRootX();
  const now = state.clock.epoch;
  const entries = [...state.auditLog].sort((a, b) => b.at - a.at);

  return (
    <div className="stack-lg">
      <div>
        <h1>Audit log</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Privileged actions record actor, action, target, timestamp, reason and before/after states. Append-only; retained per
          policy even after account deletion.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <Banner tone="info" icon={FileClock}>
            No privileged actions recorded yet. Try reviewing an application or changing the pricing config.
          </Banner>
        </Card>
      ) : (
        <div className="stack-sm">
          {entries.map((e) => (
            <Card key={e.id} className="stack-sm" style={{ padding: 14 }}>
              <div className="row-between wrap" style={{ gap: 6 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--root-800)' }}>{e.action}</span>
                  <span className="faint">· {e.actorName}</span>
                </span>
                <span className="mono faint" style={{ fontSize: 'var(--text-xs)' }}>
                  {fmtDay(e.at, now)} {fmtTime(e.at)}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                <strong>Target:</strong> {e.target}
              </div>
              {e.reason && (
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  <strong>Reason:</strong> {e.reason}
                </div>
              )}
              {(e.before || e.after) && (
                <div className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {e.before} → {e.after}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
