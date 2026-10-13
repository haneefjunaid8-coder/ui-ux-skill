import React from 'react';
import { HeartHandshake, Scale, Star, Timer } from 'lucide-react';
import { Banner, Card, Stat } from '../../ds';
import { useRootX, myRider } from '../../engine/store';
import { fmtDay } from '../../components/bits';

export default function RiderPerformance() {
  const state = useRootX();
  const rider = myRider(state)!;
  const now = state.clock.epoch;
  const rated = state.deliveries.filter((d) => d.riderId === rider.id && d.rating);

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1>Performance</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Stat label="Rating" value={rider.rating.toFixed(2)} delta={`${rated.length} reviews`} />
        <Stat label="Completed" value={rider.completed} delta="deliveries" />
        <Stat label="On time" value={`${Math.round(rider.onTimeRate * 100)}%`} tone="go" />
      </div>

      <Card className="stack-sm">
        <div className="data-label">Recent feedback</div>
        {rated.slice(0, 6).map((d) => (
          <div key={d.id} className="stack-sm" style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: 10 }}>
            <div className="row-between">
              <span className="row" style={{ gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} color={i < (d.rating?.stars ?? 0) ? 'var(--dusk-500)' : 'var(--earth-300)'} fill={i < (d.rating?.stars ?? 0) ? 'var(--dusk-500)' : 'transparent'} />
                ))}
              </span>
              <span className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>{d.ref} · {fmtDay(d.rating!.at, now)}</span>
            </div>
            {d.rating?.comment && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>"{d.rating.comment}"</p>}
          </div>
        ))}
        {rated.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No ratings yet.</p>}
      </Card>

      <Card className="stack-sm">
        <div className="row" style={{ gap: 12 }}>
          <HeartHandshake size={20} style={{ color: 'var(--root-700)', flexShrink: 0 }} />
          <div>
            <strong>How performance is evaluated</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Contextual, never automatic: punctuality, acceptance patterns, verified safety incidents (kept separate from
              ratings), package handling, communication and status accuracy. One bad night, one unfair rating, or a
              safety-related pause never defines you.
            </p>
          </div>
        </div>
      </Card>

      <Card className="stack-sm">
        <div className="row" style={{ gap: 12 }}>
          <Scale size={20} style={{ color: 'var(--adire-700)', flexShrink: 0 }} />
          <div>
            <strong>Your rights</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              You can respond to any review and appeal moderation decisions. Abusive or fraudulent reviews are removed after human
              review. Serious account restrictions always get human review first.
            </p>
          </div>
        </div>
      </Card>

      <Banner tone="info" icon={Timer}>
        Re-verification is required periodically (per session/year, configurable) to keep your rider status active.
      </Banner>
    </div>
  );
}
