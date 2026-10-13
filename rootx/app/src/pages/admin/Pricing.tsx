import React, { useState } from 'react';
import { Save, Tags } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, Select, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { Money } from '../../components/bits';
import { quote } from '../../engine/pricing';
import { fmtNaira } from '../../engine/ledger';

export default function AdminPricing() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const p = state.config.pricing;
  const h = state.config.hours;

  const [form, setForm] = useState({ ...p, sizeMedium: p.sizeTierFees.medium, sizeLarge: p.sizeTierFees.large, sizeXl: p.sizeTierFees.xlarge });
  const [hoursForm, setHoursForm] = useState({ ...h });
  const [policy, setPolicy] = useState(state.config.policies.interZonePolicy);
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function save() {
    if (!reason.trim()) return toast('Config changes require a reason for the audit trail.', 'warn');
    dispatch({
      type: 'admin/updateConfig',
      patch: {
        pricing: {
          ...form,
          sizeTierFees: { small: 0, medium: form.sizeMedium, large: form.sizeLarge, xlarge: form.sizeXl },
        },
        hours: { ...hoursForm },
        policies: { interZonePolicy: policy },
      },
      reason,
    });
    toast('Pricing & hours updated — new config version live without redeploying.', 'success');
    setConfirmOpen(false);
    setReason('');
  }

  // live preview calculator
  const preview = quote({
    stops: [
      { x: 250, y: 420 },
      { x: 350, y: 240 },
    ],
    pkg: { sizeTier: 'medium', weightKg: 8, fragile: true, food: false, declaredValue: null },
    transport: 'motorcycle',
    config: { ...p, baseFare: form.baseFare, perKm: form.perKm, sizeTierFees: { small: 0, medium: form.sizeMedium, large: form.sizeLarge, xlarge: form.sizeXl }, includedWeightKg: form.includedWeightKg, perExtraKg: form.perExtraKg, fragileFee: form.fragileFee, foodSealedFee: form.foodSealedFee, minFare: form.minFare },
  });

  return (
    <div className="stack-lg">
      <div>
        <h1>Pricing &amp; service hours</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          All parameters are configurable at runtime — versioned and audited. ⚠ Current values are <strong>demo defaults</strong>,
          not final business policy; final fares and commission require founder sign-off.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card className="stack">
          <div className="data-label">Fares</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Num label="Base fare (₦)" value={form.baseFare} onChange={(v) => setForm({ ...form, baseFare: v })} />
            <Num label="Per km (₦)" value={form.perKm} onChange={(v) => setForm({ ...form, perKm: v })} />
            <Num label="Included km" value={form.includedKm} step={0.5} onChange={(v) => setForm({ ...form, includedKm: v })} />
            <Num label="Min fare (₦)" value={form.minFare} onChange={(v) => setForm({ ...form, minFare: v })} />
            <Num label="Included weight (kg)" value={form.includedWeightKg} onChange={(v) => setForm({ ...form, includedWeightKg: v })} />
            <Num label="Per extra kg (₦)" value={form.perExtraKg} onChange={(v) => setForm({ ...form, perExtraKg: v })} />
            <Num label="Medium tier (₦)" value={form.sizeMedium} onChange={(v) => setForm({ ...form, sizeMedium: v })} />
            <Num label="Large tier (₦)" value={form.sizeLarge} onChange={(v) => setForm({ ...form, sizeLarge: v })} />
            <Num label="X-large tier (₦)" value={form.sizeXl} onChange={(v) => setForm({ ...form, sizeXl: v })} />
            <Num label="Fragile fee (₦)" value={form.fragileFee} onChange={(v) => setForm({ ...form, fragileFee: v })} />
            <Num label="Sealed food fee (₦)" value={form.foodSealedFee} onChange={(v) => setForm({ ...form, foodSealedFee: v })} />
            <Num label="Extra stop fee (₦)" value={form.extraStopFee} onChange={(v) => setForm({ ...form, extraStopFee: v })} />
          </div>
        </Card>

        <div className="stack">
          <Card className="stack">
            <div className="data-label">Commission &amp; gateway</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Num label="Commission (%)" value={form.commissionPct} onChange={(v) => setForm({ ...form, commissionPct: v })} />
              <Num label="Gateway fixed (₦)" value={form.gatewayFeeFixed} onChange={(v) => setForm({ ...form, gatewayFeeFixed: v })} />
              <Num label="Gateway (%)" value={form.gatewayFeePct} step={0.25} onChange={(v) => setForm({ ...form, gatewayFeePct: v })} />
              <Num label="High-value threshold (₦)" value={form.highValueThreshold} step={5000} onChange={(v) => setForm({ ...form, highValueThreshold: v })} />
            </div>
            <Banner tone="warn">
              Commission is <strong>unresolved</strong> — the 15% default is a placeholder pending founder approval and operational
              analysis.
            </Banner>
          </Card>

          <Card className="stack">
            <div className="data-label">Service hours (safety schedule)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Num label="Opening hour" value={hoursForm.openHour} onChange={(v) => setHoursForm({ ...hoursForm, openHour: v })} />
              <Num label="Warning hour (6 PM rule)" value={hoursForm.warningHour} onChange={(v) => setHoursForm({ ...hoursForm, warningHour: v })} />
              <Num label="Closing hour (9 PM rule)" value={hoursForm.closeHour} onChange={(v) => setHoursForm({ ...hoursForm, closeHour: v })} />
              <Num label="Booking cutoff buffer (min)" value={hoursForm.bookingCutoffBufferMin} onChange={(v) => setHoursForm({ ...hoursForm, bookingCutoffBufferMin: v })} />
              <Num label="Handling buffer (min)" value={hoursForm.handlingBufferMin} onChange={(v) => setHoursForm({ ...hoursForm, handlingBufferMin: v })} />
              <Num label="Active-run grace (min)" value={hoursForm.activeGraceMin} onChange={(v) => setHoursForm({ ...hoursForm, activeGraceMin: v })} />
            </div>
            <Field label="Inter-zone policy">
              <Select value={policy} onChange={(e) => setPolicy(e.target.value as typeof policy)}>
                <option value="intra_zone_only">Intra-zone only (default — inter-campus off)</option>
                <option value="same_campus">Same campus group (campus + its townships)</option>
                <option value="any_active_zone">Any active zone (requires approval)</option>
              </Select>
            </Field>
          </Card>
        </div>
      </div>

      <Card className="stack-sm">
        <div className="data-label">Live preview — market run, 2.1 km, 8 kg, medium, fragile</div>
        <div className="row wrap" style={{ gap: 16 }}>
          <span>
            Customer pays <strong><Money value={preview.total} /></strong>
          </span>
          <span className="muted">
            Rider net{' '}
            <Money
              value={(() => {
                const gatewayFee = Math.round(form.gatewayFeeFixed + (preview.total * form.gatewayFeePct) / 100);
                const commission = Math.round((preview.total * form.commissionPct) / 100);
                return preview.total - gatewayFee - commission;
              })()}
            />
          </span>
        </div>
        {preview.lines.map((l) => (
          <div key={l.key} className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
            <span className="faint">{l.label}</span>
            <Money value={l.amount} />
          </div>
        ))}
        <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
          Test quotes before saving — the same engine powers the customer app, so previews are exact.
        </p>
      </Card>

      <div className="row">
        <Button icon={Save} onClick={() => setConfirmOpen(true)}>
          Save configuration (audited)
        </Button>
        <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>
          current version v{state.config.version} · changes create v{state.config.version + 1}
        </span>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm configuration change"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save &amp; version</Button>
          </>
        }
      >
        <Banner tone="warn" icon={Tags}>
          Pricing changes affect new quotes only — never in-flight payments. The change is versioned and recorded as {actor.name} ·
          config.update · reason below.
        </Banner>
        <Field label="Reason (required)" required>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Adjust per-km after fuel price review; approved by founder" />
        </Field>
      </Modal>
    </div>
  );
}

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <Field label={label}>
      <TextInput type="number" value={value} step={step} min={0} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}
