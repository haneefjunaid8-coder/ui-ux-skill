import React, { useState } from 'react';
import { Banknote, Download, TrendingUp } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, Stat, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, myRider } from '../../engine/store';
import { Money, fmtDay, fmtTime } from '../../components/bits';
import { fmtNaira } from '../../engine/ledger';

export default function RiderEarnings() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const rider = myRider(state)!;
  const now = state.clock.epoch;
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState(Math.max(state.config.policies.payoutMinAmount, Math.floor(rider.availableEarnings / 100) * 100));

  const myRuns = state.deliveries.filter((d) => d.riderId === rider.id && d.ledger);
  const payouts = state.payouts.filter((p) => p.riderId === rider.id);
  const commissionPct = state.config.pricing.commissionPct;

  function downloadStatement() {
    const rows = [
      ['date', 'reference', 'gross_charge', 'gateway_fee', 'commission', 'rider_net', 'settlement'],
      ...myRuns.map((d) => [new Date(d.createdAt).toISOString(), d.ref, String(d.ledger!.charge), String(d.ledger!.gatewayFee), String(d.ledger!.commission), String(d.ledger!.riderNet), d.ledger!.settlement]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rootx-rider-earnings.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Earnings statement downloaded.', 'success');
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1>Earnings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Stat label="Pending settlement" value={<Money value={rider.pendingEarnings} />} delta="after delivery completes" />
        <Stat label="Available" value={<Money value={rider.availableEarnings} />} tone="go" delta="ready for payout" />
        <Stat label="Commission" value={`${commissionPct}%`} delta="configurable — shown transparently" />
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <Button icon={Banknote} disabled={rider.availableEarnings < state.config.policies.payoutMinAmount} onClick={() => setPayoutOpen(true)}>
          Request payout (min {fmtNaira(state.config.policies.payoutMinAmount)})
        </Button>
        <Button variant="secondary" icon={Download} onClick={downloadStatement}>
          Statement (CSV)
        </Button>
      </div>

      <Card className="stack-sm">
        <div className="data-label">Completed runs</div>
        {myRuns.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No completed runs yet.</p>}
        {myRuns.map((d) => (
          <div key={d.id} className="row-between" style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: 8 }}>
            <div>
              <span className="mono" style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{d.ref}</span>
              <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                {fmtDay(d.createdAt, now)} {fmtTime(d.createdAt)} · charge {fmtNaira(d.ledger!.charge)} − fee {fmtNaira(d.ledger!.gatewayFee)} − commission {fmtNaira(d.ledger!.commission)}
              </span>
            </div>
            <div style={{ textAlign: 'end' }}>
              <Money value={d.ledger!.riderNet - d.ledger!.refunded} />
              <span className={`pill ${d.ledger!.settlement === 'settled' ? 'pill-go' : 'pill-wait'}`} style={{ display: 'block', marginTop: 2 }}>
                {d.ledger!.settlement}
              </span>
            </div>
          </div>
        ))}
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Payouts</div>
        {payouts.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No payouts yet.</p>}
        {payouts.map((p) => (
          <div key={p.id} className="row-between" style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--line-subtle)', paddingBottom: 6 }}>
            <span>
              <Money value={p.amount} />
              <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                {fmtDay(p.requestedAt, now)} {fmtTime(p.requestedAt)}
              </span>
            </span>
            <span className={`pill ${p.status === 'paid' ? 'pill-go' : p.status === 'rejected' ? 'pill-alert' : 'pill-wait'}`}>{p.status}</span>
          </div>
        ))}
      </Card>

      <Banner tone="info" icon={TrendingUp}>
        Settlement flow: delivery completed → ledger 'ready' → finance runs a settlement batch → admin approves (two-person rule)
        → balance available → payout after fraud checks. Bank payouts run through the payment provider's transfer API with KYC.
      </Banner>

      <Modal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        title="Request payout"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayoutOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                dispatch({ type: 'rider/payoutRequest', riderId: rider.id, amount });
                setPayoutOpen(false);
                toast('Payout requested — runs after finance reconciliation and fraud checks.', 'success');
              }}
            >
              Request <Money value={amount} />
            </Button>
          </>
        }
      >
        <Field label={`Amount (available ${fmtNaira(rider.availableEarnings)})`} required>
          <TextInput type="number" value={amount} min={state.config.policies.payoutMinAmount} step={100} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Banner tone="info">
          Payouts are subject to identity verification and fraud checks per policy. The provider's transfer rails and KYC
          requirements apply (see docs/10-payments.md).
        </Banner>
      </Modal>
    </div>
  );
}
