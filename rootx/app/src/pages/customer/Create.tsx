import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, CreditCard, Landmark, MapPin, Plus, Repeat, Trash2, Wallet as WalletIcon, Banknote, ArrowRight } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, RadioCard, Segmented, Select, Stepper, TextArea, TextInput, Toggle, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser, activeZones, serviceWindowNow } from '../../engine/store';
import { LiveMap } from '../../components/LiveMap';
import { Money, PhotoTile } from '../../components/bits';
import { fmtNaira } from '../../engine/ledger';
import { checkZoneEligibility, ALL_ZONES } from '../../engine/zones';
import { quote as computeQuote, validatePackage } from '../../engine/pricing';
import { sizeTierFromDims } from '../../engine/config';
import { evaluateServiceWindow, scheduledSlotOk } from '../../engine/safety';
import { eligibleRiders } from '../../engine/matching';
import { svgPhoto } from '../../engine/seed';
import { CATEGORY_LABELS, PROHIBITED_ITEMS } from '../../engine/config';
import type { PackageCategory, PackageInfo, PaymentMethod, SizeTier, Stop } from '../../engine/types';

/* ============================================================================
   Create delivery — guided 4-step flow on one screen size:
   Route → Package → Timing → Review & pay. Every eligibility rule runs before
   payment: zone eligibility, prohibited-items declaration, capacity limits,
   safety-hours window and rider availability.
   ========================================================================== */

const STEPS = ['Route', 'Package', 'Timing', 'Review'];

interface StopDraft {
  kind: 'pickup' | 'dropoff';
  label: string;
  x: number;
  y: number;
  zoneId: string;
  landmarkId?: string;
  receiverName: string;
  receiverPhone: string;
}

export default function CreateDelivery() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const zones = activeZones(state);
  const bookableZones = zones.filter((z) => z.id === 'osogbo-campus' || z.id === 'oke-baale');

  const [step, setStep] = useState(0);
  const [selectingIdx, setSelectingIdx] = useState<number | null>(0);

  const [stops, setStops] = useState<StopDraft[]>([
    { kind: 'pickup', label: '', x: 0, y: 0, zoneId: '', receiverName: user.name, receiverPhone: user.phone },
    { kind: 'dropoff', label: '', x: 0, y: 0, zoneId: '', receiverName: '', receiverPhone: '' },
  ]);

  const [pkg, setPkg] = useState<PackageInfo>({
    description: '',
    category: 'documents',
    quantity: 1,
    weightKg: 1,
    dimensions: { l: 25, w: 18, h: 8 },
    sizeTier: 'small',
    photos: [],
    fragile: false,
    food: false,
    declaredValue: null,
    handlingNotes: '',
    contentsDeclared: false,
  });

  const [timing, setTiming] = useState<'now' | 'scheduled' | 'recurring'>('now');
  const [schedDate, setSchedDate] = useState(() => {
    const d = new Date(state.clock.epoch + 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const [schedTime, setSchedTime] = useState('10:00');
  const [recDays, setRecDays] = useState<number[]>([1, 4]);
  const [recTime, setRecTime] = useState('08:30');

  const [payMethod, setPayMethod] = useState<PaymentMethod>('wallet');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);

  const now = state.clock.epoch;

  /* ---- derived validation ---- */
  const zoneCheck = useMemo(() => {
    const pts = stops.map((s) => ({ x: s.x, y: s.y }));
    return checkZoneEligibility(pts[0], pts.slice(1), zones, state.config.policies.interZonePolicy);
  }, [stops, zones, state.config.policies.interZonePolicy]);

  const pkgValidation = useMemo(() => validatePackage(pkg, state.config.pricing), [pkg, state.config.pricing]);

  const routeStops: Stop[] = stops.map((s, i) => ({
    id: 's' + i,
    kind: s.kind,
    label: s.label || (s.kind === 'pickup' ? 'Pickup point' : 'Destination'),
    x: s.x,
    y: s.y,
    zoneId: s.zoneId,
    landmarkId: s.landmarkId,
    receiver: s.kind === 'dropoff' ? { name: s.receiverName, phone: s.receiverPhone } : undefined,
  }));

  const q = useMemo(
    () => computeQuote({ stops: routeStops.length >= 2 ? routeStops : [...routeStops, routeStops[0]], pkg, transport: 'motorcycle', config: state.config.pricing }),
    [routeStops, pkg, state.config.pricing],
  );

  const schedFor = timing === 'scheduled' ? new Date(schedDate + 'T' + schedTime).getTime() : null;
  const slotCheck = timing === 'scheduled' && schedFor ? scheduledSlotOk(schedFor, q.etaMinutes, state.config.hours) : { ok: true as const };

  const serviceWindow = evaluateServiceWindow(now, q.etaMinutes, state.config.hours);

  const matchingPreview = useMemo(() => {
    const fake = { stops: routeStops, package: pkg } as never;
    return eligibleRiders(fake, state.riders, state.config.policies);
  }, [routeStops, pkg, state.riders, state.config.policies]);

  const stepErrors: Record<number, string[]> = {
    0: [
      ...stops.map((s, i) => (s.x === 0 && s.y === 0 ? `Set the ${s.kind === 'pickup' ? 'pickup' : 'destination'} ${stops.length > 2 ? i + 1 : ''}` : '')).filter(Boolean),
      ...stops.filter((s) => s.kind === 'dropoff' && (!s.receiverName || !s.receiverPhone)).map(() => 'Add receiver name and phone for each destination'),
      ...(zoneCheck.eligible ? [] : [zoneCheck.reason ?? 'Route not eligible']),
    ].filter(Boolean) as string[],
    1: pkgValidation.errors,
    2: slotCheck.ok ? [] : [slotCheck.reason ?? 'Invalid schedule'],
    3: [
      ...(timing === 'now' && !serviceWindow.allowNewBooking ? [serviceWindow.message] : []),
      ...(matchingPreview.eligible.length === 0 && timing === 'now' ? ['No eligible rider is currently available for this package (capacity, zone or special handling). Try again shortly or reduce the package.'] : []),
    ],
  };

  const created = state.deliveries.find((d) => d.id === createdId);

  /* auto-offer once payment succeeds */
  React.useEffect(() => {
    if (created && created.status === 'awaiting_rider' && !paid) {
      setPaid(true);
      dispatch({ type: 'delivery/offer', deliveryId: created.id });
    }
  }, [created?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- handlers ---- */
  function setPoint(pt: { x: number; y: number }, idx: number, label?: string, landmarkId?: string) {
    const z = zones.find((z) => z.id) ? zones.find((zz) => Math.abs(zz.polygon[0].x) >= 0 && ptInZone(pt, zz)) : undefined;
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, x: pt.x, y: pt.y, label: label ?? nearestName(pt, z) ?? `Map pin (${pt.x}, ${pt.y})`, zoneId: z?.id ?? '', landmarkId } : s)));
  }

  function ptInZone(pt: { x: number; y: number }, z: { polygon: { x: number; y: number }[] }) {
    let inside = false;
    for (let i = 0, j = z.polygon.length - 1; i < z.polygon.length; j = i++) {
      const xi = z.polygon[i].x, yi = z.polygon[i].y, xj = z.polygon[j].x, yj = z.polygon[j].y;
      if (yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function nearestName(pt: { x: number; y: number }, zone?: { landmarks: { name: string; x: number; y: number }[] }) {
    if (!zone) return undefined;
    const near = zone.landmarks.map((l) => ({ l, d: Math.hypot(l.x - pt.x, l.y - pt.y) })).sort((a, b) => a.d - b.d)[0];
    return near && near.d < 30 ? 'Near ' + near.l.name : undefined;
  }

  function addStop() {
    setStops((p) => [...p, { kind: 'dropoff', label: '', x: 0, y: 0, zoneId: '', receiverName: '', receiverPhone: '' }]);
    setSelectingIdx(stops.length);
  }

  function moveStopUp(i: number) {
    if (i < 2) return;
    setStops((p) => {
      const n = [...p];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      const first = n[0];
      n[0] = { ...first, kind: 'pickup' };
      n[1] = { ...n[1], kind: 'dropoff' };
      return n;
    });
  }

  function submit() {
    if (stepErrors[3].length > 0) return;
    dispatch({
      type: 'delivery/create',
      input: {
        kind: timing === 'now' ? 'immediate' : timing === 'scheduled' ? 'scheduled' : 'recurring',
        scheduledFor: schedFor,
        stops: routeStops,
        pkg,
        transport: 'motorcycle',
        recurrence: timing === 'recurring' ? { days: recDays, time: recTime } : null,
      },
    });
    // find the just-created delivery (highest createdAt for this user)
    const mine = state.deliveries.filter((d) => d.customerId === user.id);
    toast('Request created — complete payment to match riders.', 'success');
    setCreatedId(null);
    // The new delivery is appended by the reducer; capture via effect below.
    setAwaitCreate(true);
  }

  const [awaitCreate, setAwaitCreate] = useState(false);
  React.useEffect(() => {
    if (awaitCreate) {
      const mine = state.deliveries.filter((d) => d.customerId === user.id).sort((a, b) => b.createdAt - a.createdAt);
      const latest = mine[0];
      if (latest && latest.status === 'awaiting_payment' && (!createdId || latest.id !== createdId)) {
        setCreatedId(latest.id);
        setAwaitCreate(false);
      }
    }
  }, [state.deliveries, awaitCreate, createdId]); // eslint-disable-line react-hooks/exhaustive-deps

  function pay() {
    if (!created) return;
    if (payMethod === 'wallet' && user.walletBalance < q.total) {
      toast('Wallet balance is too low. Top up or choose card/transfer.', 'error');
      return;
    }
    setPaying(true);
    dispatch({ type: 'delivery/pay', deliveryId: created.id, method: payMethod });
    setTimeout(() => setPaying(false), 600);
  }

  /* ---- matching screen (after payment) ---- */
  if (created && paid) {
    return <MatchingScreen deliveryId={created.id} />;
  }

  const sel = selectingIdx != null ? stops[selectingIdx] : null;

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div>
        <h1>New delivery</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {q.distanceKm.toFixed(1)} km · est. {q.etaMinutes} min · <Money value={q.total} />
        </p>
      </div>

      <Card>
        <Stepper steps={STEPS} current={step} />
      </Card>

      {serviceWindow.phase !== 'open' && timing === 'now' && step === 3 && null}

      {/* ---------- STEP 1: ROUTE ---------- */}
      {step === 0 && (
        <div className="stack">
          <div className="stack-sm">
            {stops.map((s, i) => (
              <Card key={i} className="stack-sm" style={{ borderColor: selectingIdx === i ? 'var(--root-400)' : undefined }}>
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <span
                      className="mono"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        background: s.kind === 'pickup' ? 'var(--root-100)' : 'var(--adire-100)',
                        color: s.kind === 'pickup' ? 'var(--root-800)' : 'var(--adire-800)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <strong>{s.kind === 'pickup' ? 'Pickup' : `Destination ${i}`}</strong>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    {i >= 2 && (
                      <Button variant="ghost" size="sm" onClick={() => moveStopUp(i)} aria-label="Reorder stop">
                        ↑
                      </Button>
                    )}
                    {i >= 2 && (
                      <Button variant="ghost" size="sm" icon={Trash2} aria-label="Remove stop" onClick={() => setStops((p) => p.filter((_, j) => j !== i))} />
                    )}
                    <Button variant={selectingIdx === i ? 'primary' : 'secondary'} size="sm" icon={MapPin} onClick={() => setSelectingIdx(i)}>
                      {s.x ? 'Change' : 'Set'}
                    </Button>
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {s.x ? `${s.label}${s.zoneId ? ' · ' + zones.find((z) => z.id === s.zoneId)?.name : ''}` : 'Not set — tap the map or pick a landmark/saved place'}
                </div>
                {s.kind === 'dropoff' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Receiver name" required>
                      <TextInput value={s.receiverName} onChange={(e) => setStops((p) => p.map((x, j) => (j === i ? { ...x, receiverName: e.target.value } : x)))} placeholder="Who receives it?" />
                    </Field>
                    <Field label="Receiver phone" required hint="They get a private tracking link + delivery code.">
                      <TextInput value={s.receiverPhone} onChange={(e) => setStops((p) => p.map((x, j) => (j === i ? { ...x, receiverPhone: e.target.value } : x)))} placeholder="0803 …" inputMode="tel" />
                    </Field>
                  </div>
                )}
              </Card>
            ))}
            {stops.length < 4 && (
              <Button variant="secondary" size="sm" icon={Plus} onClick={addStop}>
                Add another destination
              </Button>
            )}
            <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
              Multi-stop runs are sequenced in order; the first stop must be the pickup. Extra stops add {fmtNaira(state.config.pricing.extraStopFee)} each.
            </p>
          </div>

          <LiveMap
            zones={bookableZones.length ? bookableZones : zones}
            height={330}
            caption="Tap the map to place the selected stop, or tap a landmark square. Approved campus + township zones."
            highlightLandmarkId={sel?.landmarkId}
            pins={stops.filter((s) => s.x).map((s, i) => ({ x: s.x, y: s.y, kind: s.kind === 'pickup' ? 'pickup' : 'dropoff', index: i + 1, label: selectingIdx === i ? 'Setting…' : undefined }))}
            route={stops.every((s) => s.x) ? stops.map((s) => ({ x: s.x, y: s.y })) : undefined}
            onMapClick={(pt) => selectingIdx != null && setPoint(pt, selectingIdx)}
            onLandmarkClick={(id) => {
              if (selectingIdx == null) return;
              const z = zones.find((zz) => zz.landmarks.some((l) => l.id === id));
              const l = z?.landmarks.find((l) => l.id === id);
              if (z && l) setPoint({ x: l.x, y: l.y }, selectingIdx, l.name, id);
            }}
          />

          <div className="stack-sm">
            <div className="data-label">Saved places</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {user.savedLocations.map((sl) => (
                <button key={sl.id} className="btn btn-sm btn-secondary" onClick={() => setPoint({ x: sl.x, y: sl.y }, selectingIdx ?? 0, sl.label, sl.landmarkId)}>
                  <Landmark size={13} /> {sl.label}
                </button>
              ))}
            </div>
          </div>

          {zoneCheck.needsExceptionReview && zoneCheck.reason && (
            <Banner tone="warn" title="Outside the approved service area">
              {zoneCheck.reason} You can request an exception review from Support — approvals are manual and logged.
            </Banner>
          )}
        </div>
      )}

      {/* ---------- STEP 2: PACKAGE ---------- */}
      {step === 1 && (
        <div className="stack">
          <Card className="stack">
            <Field label="What are you sending?" required htmlFor="pkg-desc">
              <TextInput id="pkg-desc" value={pkg.description} onChange={(e) => setPkg({ ...pkg, description: e.target.value })} placeholder="e.g. Two sealed grocery bags" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Category" required htmlFor="pkg-cat">
                <Select id="pkg-cat" value={pkg.category} onChange={(e) => setPkg({ ...pkg, category: e.target.value as PackageCategory })}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity" required htmlFor="pkg-qty">
                <TextInput id="pkg-qty" type="number" min={1} value={pkg.quantity} onChange={(e) => setPkg({ ...pkg, quantity: Math.max(1, Number(e.target.value)) })} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Field label="Length (cm)" required>
                <TextInput type="number" min={1} value={pkg.dimensions.l} onChange={(e) => updDims('l', e.target.value)} />
              </Field>
              <Field label="Width (cm)" required>
                <TextInput type="number" min={1} value={pkg.dimensions.w} onChange={(e) => updDims('w', e.target.value)} />
              </Field>
              <Field label="Height (cm)" required>
                <TextInput type="number" min={1} value={pkg.dimensions.h} onChange={(e) => updDims('h', e.target.value)} />
              </Field>
            </div>
            <div className="row-between">
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Size tier: <strong>{sizeTierFromDims(pkg.dimensions)}</strong> ({((pkg.dimensions.l * pkg.dimensions.w * pkg.dimensions.h) / 1000).toFixed(0)} L)
              </span>
              <Field label="Weight (kg)" required>
                <TextInput type="number" min={0.1} step={0.1} value={pkg.weightKg} onChange={(e) => setPkg({ ...pkg, weightKg: Number(e.target.value) })} style={{ width: 100 }} />
              </Field>
            </div>
          </Card>

          <Card className="stack">
            <Field label="Package photographs" required hint="At least one photo is required for every delivery. Kept private to you, the rider and authorised staff.">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pkg.photos.map((p, i) => (
                  <PhotoTile key={i} src={p} alt={`Package photo ${i + 1}`} onRemove={() => setPkg({ ...pkg, photos: pkg.photos.filter((_, j) => j !== i) })} />
                ))}
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ width: 84, height: 64, flexDirection: 'column', gap: 2, fontSize: 'var(--text-2xs)' }}
                >
                  <Camera size={18} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).slice(0, 3);
                      files.forEach((f) => {
                        const rd = new FileReader();
                        rd.onload = () => setPkg((p) => ({ ...p, photos: [...p.photos, String(rd.result)].slice(0, 4) }));
                        rd.readAsDataURL(f);
                      });
                    }}
                  />
                </label>
                <button className="btn btn-ghost btn-sm" style={{ height: 64, flexDirection: 'column', gap: 2, fontSize: 'var(--text-2xs)' }} onClick={() => setPkg((p) => ({ ...p, photos: [...p.photos, svgPhoto('PACKAGE PHOTO', '#2f855a')] }))}>
                  <Camera size={18} />
                  Sample photo
                </button>
              </div>
            </Field>
          </Card>

          <Card className="stack">
            <div className="data-label">Handling</div>
            <label className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
              <span>
                <strong>Fragile</strong> — breakables need careful handling
                <span className="muted" style={{ display: 'block' }}>Matches only riders qualified for fragile ({fmtNaira(state.config.pricing.fragileFee)})</span>
              </span>
              <Toggle checked={pkg.fragile} onChange={(v) => setPkg({ ...pkg, fragile: v })} label="Fragile" />
            </label>
            <label className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
              <span>
                <strong>Food</strong> — sealed food handling
                <span className="muted" style={{ display: 'block' }}>Sealed packaging required ({fmtNaira(state.config.pricing.foodSealedFee)})</span>
              </span>
              <Toggle checked={pkg.food} onChange={(v) => setPkg({ ...pkg, food: v })} label="Food" />
            </label>
            <Field label="Declared value (₦)" hint={`Values above ${fmtNaira(state.config.pricing.highValueThreshold)} trigger high-value rules; above ${fmtNaira(state.config.pricing.maxDeclaredValue)} is not accepted yet.`}>
              <TextInput type="number" min={0} value={pkg.declaredValue ?? ''} onChange={(e) => setPkg({ ...pkg, declaredValue: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Optional" />
            </Field>
            <Field label="Handling instructions">
              <TextArea value={pkg.handlingNotes} onChange={(e) => setPkg({ ...pkg, handlingNotes: e.target.value })} placeholder="e.g. Keep flat, don't stack" />
            </Field>
            <label className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={pkg.contentsDeclared} onChange={(e) => setPkg({ ...pkg, contentsDeclared: e.target.checked })} style={{ marginTop: 3, width: 17, height: 17, accentColor: 'var(--root-600)' }} />
              <span>
                I declare the contents are legal and not on the prohibited list (illegal drugs, weapons, hazardous chemicals, live
                animals, alcohol/tobacco, large cash, stolen or counterfeit goods).
              </span>
            </label>
          </Card>
          {pkgValidation.warnings.map((wn, i) => (
            <Banner key={i} tone="warn">{wn}</Banner>
          ))}
        </div>
      )}

      {/* ---------- STEP 3: TIMING ---------- */}
      {step === 2 && (
        <div className="stack">
          <Card className="stack-sm">
            <Segmented
              ariaLabel="Delivery timing"
              value={timing}
              onChange={setTiming}
              options={[
                { value: 'now', label: 'Immediate' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'recurring', label: 'Recurring' },
              ]}
            />
            {timing === 'now' && (
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                We'll match a rider right after payment. Estimated completion {new Date(now + q.etaMinutes * 60_000).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}.
              </p>
            )}
            {timing === 'scheduled' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Date" required>
                  <TextInput type="date" value={schedDate} min={new Date(now).toISOString().slice(0, 10)} onChange={(e) => setSchedDate(e.target.value)} />
                </Field>
                <Field label="Time" required hint={`Slots must finish before 9 PM closure.`}>
                  <TextInput type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                </Field>
              </div>
            )}
            {timing === 'recurring' && (
              <div className="stack">
                <Field label="Repeat on" required>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <button
                        key={d}
                        className="btn btn-sm"
                        aria-pressed={recDays.includes(i)}
                        style={{
                          background: recDays.includes(i) ? 'var(--root-600)' : 'var(--surface-inset)',
                          color: recDays.includes(i) ? 'white' : 'var(--ink-2)',
                          border: '1px solid var(--line)',
                          borderRadius: 999,
                          paddingInline: 12,
                        }}
                        onClick={() => setRecDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Pickup time" required hint="Each occurrence is auto-created and paid from your wallet.">
                  <TextInput type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} style={{ maxWidth: 160 }} />
                </Field>
                <Banner tone="info" icon={Repeat}>
                  This first booking becomes the template. Future occurrences are wallet-debited and can be paused, skipped or cancelled anytime.
                </Banner>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ---------- STEP 4: REVIEW & PAY ---------- */}
      {step === 3 && !createdId && (
        <div className="stack">
          <Card className="stack">
            <div className="data-label">Route &amp; eligibility</div>
            {zoneCheck.eligible ? (
              <Banner tone="success" icon={Check}>
                Pickup and destination are inside the approved {zoneCheck.pickupZone?.name} zone.
              </Banner>
            ) : (
              <Banner tone="danger" title="Not eligible">{zoneCheck.reason}</Banner>
            )}
            <div className="stack-sm" style={{ fontSize: 'var(--text-sm)' }}>
              {stops.map((s, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <span className="mono faint" style={{ width: 18 }}>{i + 1}.</span>
                  <span className="grow">
                    <strong>{s.label}</strong>
                    <span className="muted" style={{ display: 'block' }}>
                      {s.kind === 'pickup' ? 'Pickup' : `To ${s.receiverName || '—'} · ${s.receiverPhone || '—'}`}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="stack">
            <div className="data-label">Price estimate</div>
            {q.lines.map((l) => (
              <div key={l.key} className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
                <span className="muted">{l.label}</span>
                <Money value={l.amount} />
              </div>
            ))}
            <hr className="route-divider" />
            <div className="row-between">
              <strong>Total</strong>
              <strong style={{ fontSize: 'var(--text-lg)' }}>
                <Money value={q.total} />
              </strong>
            </div>
            <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
              Estimates use the live pricing config (v{state.config.version}). The final charge is exactly this amount — it is never
              silently increased after payment. If a route change is ever needed, you approve it first.
            </p>
          </Card>

          {timing === 'now' && !serviceWindow.allowNewBooking && (
            <Banner tone="danger" title="Booking not available now">
              {serviceWindow.message} Choose a scheduled slot for tomorrow instead.
            </Banner>
          )}
          {timing === 'now' && serviceWindow.phase === 'warning' && (
            <Banner tone="warn" title="6 PM safety notice">{serviceWindow.message}</Banner>
          )}
          {matchingPreview.eligible.length === 0 && timing === 'now' && (
            <Banner tone="warn" title="No eligible rider right now">
              Capacity, special-handling or zone filters excluded all available riders. You can still schedule for later.
            </Banner>
          )}
          {timing !== 'now' && !slotCheck.ok && <Banner tone="danger">{slotCheck.reason}</Banner>}

          <Card className="stack">
            <div className="data-label">Pay with</div>
            <div className="stack-sm">
              <RadioCard selected={payMethod === 'wallet'} onSelect={() => setPayMethod('wallet')} title="ROOT-X wallet" desc={`Balance ${fmtNaira(user.walletBalance)}`} icon={WalletIcon} />
              <RadioCard selected={payMethod === 'card'} onSelect={() => setPayMethod('card')} title="Bank card" desc="Sandbox gateway — no real charge" icon={CreditCard} />
              <RadioCard selected={payMethod === 'transfer'} onSelect={() => setPayMethod('transfer')} title="Bank transfer" desc="Reference + webhook confirmation" icon={Banknote} />
            </div>
          </Card>

          {stepErrors[3].length > 0 && stepErrors[3].map((e, i) => <Banner key={i} tone="danger">{e}</Banner>)}

          <Button block size="lg" onClick={submit} disabled={stepErrors[3].length > 0}>
            Confirm &amp; pay <Money value={q.total} />
          </Button>
        </div>
      )}

      {/* ---------- PAYMENT ---------- */}
      {createdId && created && (
        <div className="stack">
          <Card className="stack">
            <div className="row-between">
              <div>
                <div className="data-label">{created.ref} · created</div>
                <h2 style={{ fontSize: 'var(--text-xl)' }}>Complete payment</h2>
              </div>
              <Money value={created.quote.total} size="var(--text-xl)" />
            </div>
            <Banner tone="info">
              Prototype gateway — {payMethod === 'wallet' ? 'wallet debit' : payMethod === 'card' ? 'card charge, confirmed by webhook in a few seconds' : 'bank transfer with a reference, confirmed by webhook'}.
            </Banner>
            {created.status === 'awaiting_payment' && (
              <Button block size="lg" loading={paying} onClick={pay}>
                Pay <Money value={created.quote.total} /> {payMethod === 'wallet' ? 'from wallet' : payMethod === 'card' ? 'by card' : 'by transfer'}
              </Button>
            )}
            {created.status === 'payment_processing' && (
              <Banner tone="warn" title="Payment processing">
                {payMethod === 'transfer'
                  ? 'Transfer the amount to the ROOT-X account with reference shown in your wallet. The gateway webhook will confirm automatically (simulated).'
                  : 'Confirming with the gateway…'}
              </Banner>
            )}
            {created.status === 'awaiting_payment' && created.payment?.status === 'failed' && (
              <Banner tone="danger" title="Payment failed">
                Nothing was taken. You can retry with the same or a different method.
              </Banner>
            )}
          </Card>
        </div>
      )}

      {/* ---------- nav ---------- */}
      <div className="row" style={{ gap: 10 }}>
        {step > 0 && !createdId && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {!createdId && step < 3 && (
          <Button className="grow" style={{ flex: 1 }} disabled={stepErrors[step].length > 0} onClick={() => setStep(step + 1)}>
            Continue <ArrowRight size={16} />
          </Button>
        )}
      </div>
      {stepErrors[step].length > 0 && step < 3 && (
        <Banner tone="danger" title="Fix before continuing">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {stepErrors[step].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Banner>
      )}
    </div>
  );

  function updDims(k: 'l' | 'w' | 'h', v: string) {
    const dims = { ...pkg.dimensions, [k]: Math.max(1, Number(v) || 1) };
    setPkg({ ...pkg, dimensions: dims, sizeTier: sizeTierFromDims(dims) as SizeTier });
  }
}

/* ---- matching screen ---------------------------------------------------------- */

function MatchingScreen({ deliveryId }: { deliveryId: string }) {
  const state = useRootX();
  const navigate = useNavigate();
  const d = state.deliveries.find((x) => x.id === deliveryId)!;
  const riderNames: Record<string, string> = { 'r-kofi': 'Kofi M. (bicycle)', 'r-ibrahim': 'Ibrahim S. (foot)', 'r-blessing': 'Blessing A. (motorcycle)', 'r-chidi': 'Chidi O. (motorcycle)' };
  const now = state.clock.epoch;

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <Card className="stack" style={{ textAlign: 'center', alignItems: 'center', padding: '32px 20px' }}>
        <div className="data-label">{d.ref}</div>
        {d.status === 'awaiting_rider' ? (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Finding a rider…</h2>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', maxWidth: '42ch' }}>
              We'll notify you the moment a rider accepts. You can leave this screen — updates arrive in notifications and on your
              home card.
            </p>
          </>
        ) : d.status === 'offered_to_riders' ? (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Offered to {d.offer?.offeredTo.length ?? 0} riders</h2>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Round {d.offer?.round} · first suitable rider to accept gets the run (single-assignment, no double-accepts).
            </p>
            <div className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
              {Math.max(0, Math.ceil(((d.offer?.expiresAt ?? now) - now) / 1000))}s left in this round
            </div>
            <div className="stack-sm" style={{ width: '100%', textAlign: 'start', fontSize: 'var(--text-sm)' }}>
              {(d.offer?.offeredTo ?? []).map((rid) => (
                <div key={rid} className="row-between card" style={{ padding: '8px 12px', boxShadow: 'none', background: 'var(--canvas-tint)' }}>
                  <span>{riderNames[rid] ?? 'Rider'}</span>
                  <span className="pill pill-wait">Notified</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Rider found 🎉</h2>
            <Button onClick={() => navigate(`/deliveries/${d.id}`)}>Track delivery</Button>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate('/home')}>
          Back home
        </Button>
      </Card>
    </div>
  );
}
