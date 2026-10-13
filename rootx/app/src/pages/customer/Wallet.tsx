import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Plus, Wallet as WalletIcon } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, Segmented, TextInput, useToast } from '../../ds';
import { useRootX, currentUser, myDeliveries } from '../../engine/store';
import { Money, fmtDay, fmtTime } from '../../components/bits';

/* Wallet — balances and transactions are ledger records, never editable
   profile fields. Prototype simulates top-ups; production goes through the
   payment gateway with reconciliation. */

export default function WalletPage() {
  const state = useRootX();
  const toast = useToast();
  const user = currentUser(state)!;
  const mine = myDeliveries(state, user.id);
  const now = state.clock.epoch;
  const [topUp, setTopUp] = useState(false);
  const [amount, setAmount] = useState(2000);

  const txns = [
    ...mine
      .filter((d) => d.payment)
      .map((d) => ({
        id: d.payment!.id,
        at: d.payment!.events[d.payment!.events.length - 1]?.at ?? d.createdAt,
        label: `${d.ref} — ${d.payment!.method === 'wallet' ? 'wallet debit' : d.payment!.method === 'card' ? 'card payment' : 'bank transfer'}`,
        amount: -(d.payment!.status === 'succeeded' ? d.payment!.amount : 0),
        status: d.payment!.status,
      })),
    ...mine
      .filter((d) => d.cancelledAt && (d.payment?.status === 'succeeded'))
      .map((d) => ({ id: 'rf-' + d.id, at: d.cancelledAt!, label: `${d.ref} — refund`, amount: Math.max(0, (d.payment?.amount ?? 0) - (d.ledger?.refunded ?? 0)), status: 'succeeded' as const })),
  ]
    .filter((t) => t.amount !== 0)
    .sort((a, b) => b.at - a.at);

  function downloadStatement() {
    const rows = [['date', 'time', 'reference', 'description', 'amount_ngn', 'status'], ...txns.map((t) => [new Date(t.at).toISOString(), fmtTime(t.at), t.id, t.label, String(t.amount), t.status])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rootx-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Statement downloaded (CSV).', 'success');
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1>Wallet</h1>

      <Card className="stack" style={{ background: 'linear-gradient(150deg, var(--root-700), var(--root-900))', borderColor: 'var(--root-800)', color: 'white' }}>
        <div className="data-label" style={{ color: 'oklch(0.9 0.04 150)' }}>Available balance</div>
        <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          ₦{user.walletBalance.toLocaleString('en-NG')}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setTopUp(true)} style={{ background: 'oklch(1 0 0 / 0.14)', borderColor: 'oklch(1 0 0 / 0.25)', color: 'white' }}>
            Top up
          </Button>
          <Button variant="ghost" size="sm" icon={Download} onClick={downloadStatement} style={{ color: 'white' }}>
            Statement
          </Button>
        </div>
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Recent activity</div>
        {txns.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No transactions yet.</p>}
        {txns.slice(0, 12).map((t) => (
          <div key={t.id + t.at} className="row-between" style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: 8 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ color: t.amount > 0 ? 'var(--root-600)' : 'var(--ink-3)' }}>{t.amount > 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
              <span>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.label}</span>
                <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>
                  {fmtDay(t.at, now)} · {fmtTime(t.at)} · {t.status}
                </span>
              </span>
            </div>
            <Money value={Math.abs(t.amount)} className={t.amount > 0 ? '' : 'muted'} />
          </div>
        ))}
      </Card>

      <Banner tone="info" icon={WalletIcon}>
        Balances and transactions are financial ledger records with full audit trails. Production stores integer minor units
        (kobo) and reconciles daily against gateway reports — see docs/10-payments.md.
      </Banner>

      <Modal
        open={topUp}
        onClose={() => setTopUp(false)}
        title="Top up wallet"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTopUp(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setTopUp(false);
                toast(`Demo: ₦${amount.toLocaleString()} top-up would go through the payment gateway.`, 'success');
              }}
            >
              Continue (demo)
            </Button>
          </>
        }
      >
        <Field label="Amount (₦)" required>
          <TextInput type="number" value={amount} min={500} step={500} onChange={(e) => setAmount(Math.max(500, Number(e.target.value)))} />
        </Field>
        <Segmented
          ariaLabel="Quick amounts"
          value={String(amount)}
          onChange={(v) => setAmount(Number(v))}
          options={[1000, 2000, 5000].map((n) => ({ value: String(n), label: `₦${n.toLocaleString()}` }))}
        />
        <Banner tone="info">Demo gateway — production supports cards and bank transfer with webhook confirmation and idempotency keys.</Banner>
      </Modal>
    </div>
  );
}
