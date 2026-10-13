import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Boxes, Banknote, LifeBuoy, TrendingUp } from 'lucide-react';
import { Banner, Card, Stat, type IconType } from '../../ds';
import { useRootX, serviceWindowNow } from '../../engine/store';
import { Money } from '../../components/bits';
import { fmtNaira } from '../../engine/ledger';
import { ACTIVE_ON_ROAD } from '../../engine/safety';
import { reconcile } from '../../engine/ledger';

export default function AdminOverview() {
  const state = useRootX();
  const now = state.clock.epoch;
  const w = serviceWindowNow(state);

  const active = state.deliveries.filter((d) => ACTIVE_ON_ROAD.includes(d.status));
  const today = state.deliveries.filter((d) => new Date(d.createdAt).toDateString() === new Date(now).toDateString());
  const delivered = state.deliveries.filter((d) => d.status === 'delivered');
  const cancelled = state.deliveries.filter((d) => d.status === 'cancelled');
  const ledgerRows = state.deliveries.filter((d) => d.ledger).map((d) => ({ ...d.ledger!, deliveryId: d.id }));
  const rec = reconcile(ledgerRows);
  const pendingApps = state.applications.filter((a) => ['submitted', 'under_review', 'info_required'].includes(a.status));
  const openCases = state.disputes.filter((c) => c.status !== 'resolved');
  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved');
  const settlementReady = state.deliveries.filter((d) => d.ledger?.settlement === 'ready');
  const batchesPending = state.batches.filter((b) => b.status === 'awaiting_approval');

  // simple 7-day volume bar chart (CSS bars, low-data)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(now - (6 - i) * 86_400_000);
    const count = state.deliveries.filter((d) => new Date(d.createdAt).toDateString() === day.toDateString()).length;
    return { label: day.toLocaleDateString('en-NG', { weekday: 'short' }), count };
  });
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const avgEta = delivered.length ? Math.round(delivered.reduce((a, d) => a + d.route.etaMinutes, 0) / delivered.length) : 0;

  return (
    <div className="stack-lg">
      <div className="row-between wrap" style={{ gap: 10 }}>
        <div>
          <h1>Operations overview</h1>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {w.phase === 'open' ? 'Service is open.' : w.phase === 'warning' ? '6 PM notice active — riders finishing safely.' : w.phase === 'cutoff' ? 'Late-booking cutoff reached.' : 'Closed — active runs in safe resolution.'}
          </p>
        </div>
      </div>

      {!rec.invariantsOk && (
        <Banner tone="danger" title="Ledger invariant failure">
          Reconciliation found rows where charge − fees − commission − adjustments ≠ rider net. Investigate immediately.
        </Banner>
      )}
      {batchesPending.length > 0 && (
        <Banner tone="warn" title="Settlement awaiting admin approval">
          {batchesPending.length} batch(es) proposed by finance — <Link to="/admin/finance">review</Link> (two-person rule).
        </Banner>
      )}

      <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Stat label="Active on road" value={active.length} delta="live runs" tone={active.length ? 'wait' : undefined} />
        <Stat label="Today's volume" value={today.length} delta={`${delivered.length} delivered all-time`} />
        <Stat label="Completion rate" value={`${Math.round((delivered.length / Math.max(1, delivered.length + cancelled.length)) * 100)}%`} tone="go" />
        <Stat label="Commission revenue" value={<Money value={rec.commissions} />} delta={`avg ETA ${avgEta} min`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Card className="stack-sm">
          <div className="data-label">7-day volume</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, paddingTop: 8 }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${(d.count / maxCount) * 68 + 4}px`,
                    background: i === days.length - 1 ? 'var(--root-600)' : 'var(--root-200)',
                    borderRadius: '6px 6px 2px 2px',
                  }}
                  title={`${d.count} deliveries`}
                />
                <div className="faint mono" style={{ fontSize: 10, marginTop: 4 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="stack-sm">
          <div className="data-label">Needs attention</div>
          <div className="stack-sm">
            <WorkRow icon={BadgeCheck} to="/admin/applications" label="Rider applications pending" count={pendingApps.length} tone="wait" />
            <WorkRow icon={LifeBuoy} to="/admin/cases" label="Open cases" count={openCases.length} tone="alert" />
            <WorkRow icon={AlertTriangle} to="/admin/cases" label="Open safety incidents" count={openIncidents.length} tone="alert" />
            <WorkRow icon={Banknote} to="/admin/finance" label="Ledger rows ready for settlement" count={settlementReady.length} tone="wait" />
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Card className="stack-sm">
          <div className="data-label">Active runs (live)</div>
          {active.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Nothing on the road right now.</p>}
          {active.slice(0, 5).map((d) => (
            <Link key={d.id} to="/admin/deliveries" className="row-between" style={{ textDecoration: 'none', color: 'inherit', padding: '4px 0', fontSize: 'var(--text-sm)' }}>
              <span className="mono" style={{ fontWeight: 600 }}>{d.ref}</span>
              <span className="muted">{d.stops[0].label} → {d.stops[d.stops.length - 1].label}</span>
              <span className="pill pill-motion">{d.status.replace(/_/g, ' ')}</span>
            </Link>
          ))}
        </Card>
        <Card className="stack-sm">
          <div className="data-label">Financial reconciliation (all-time)</div>
          <div className="kv"><span className="kv-key">Gross charges</span><span className="kv-val mono">{fmtNaira(rec.grossCharges)}</span></div>
          <div className="kv"><span className="kv-key">Gateway fees</span><span className="kv-val mono">−{fmtNaira(rec.gatewayFees)}</span></div>
          <div className="kv"><span className="kv-key">Commission</span><span className="kv-val mono">{fmtNaira(rec.commissions)}</span></div>
          <div className="kv"><span className="kv-key">Rider net</span><span className="kv-val mono">{fmtNaira(rec.riderNet)}</span></div>
          <div className="kv"><span className="kv-key">Refunds</span><span className="kv-val mono">−{fmtNaira(rec.refunds)}</span></div>
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            <TrendingUp size={14} style={{ color: rec.invariantsOk ? 'var(--root-600)' : 'var(--alert-600)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: rec.invariantsOk ? 'var(--root-700)' : 'var(--alert-700)' }}>
              {rec.invariantsOk ? 'Invariants hold across all rows' : 'Invariant failures — investigate'}
            </span>
          </div>
        </Card>
      </div>

      <Card className="stack-sm">
        <div className="data-label">Zone usage</div>
        {['osogbo-campus', 'oke-baale', 'ikire-campus', 'ifetedo-campus', 'ipetu-campus', 'ejigbo-campus', 'okuku-campus'].map((zid) => {
          const count = state.deliveries.filter((d) => d.stops[0].zoneId === zid).length;
          const active = state.config.zonesActive[zid] !== false;
          return (
            <div key={zid} className="row-between" style={{ fontSize: 'var(--text-sm)', padding: '3px 0' }}>
              <span className="muted">{zid.replace(/-/g, ' ')}</span>
              <span className="row" style={{ gap: 8 }}>
                <span className="mono faint">{count} runs</span>
                <span className={`pill ${active ? 'pill-go' : 'pill-hold'}`}>{active ? 'active' : 'suspended'}</span>
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function WorkRow({ icon: Icon, to, label, count, tone }: { icon: IconType; to: string; label: string; count: number; tone: 'wait' | 'alert' }) {
  return (
    <Link to={to} className="row-between" style={{ textDecoration: 'none', color: 'inherit', padding: '4px 0', fontSize: 'var(--text-sm)' }}>
      <span className="row" style={{ gap: 8 }}>
        <Icon size={15} /> {label}
      </span>
      <span className={`pill pill-${tone}`}>{count}</span>
    </Link>
  );
}
