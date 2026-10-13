import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, FileCheck2, ShieldCheck } from 'lucide-react';
import { Banner, Button, Card, Field, Select, Stepper, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { svgPhoto } from '../../engine/seed';
import { TRANSPORT_CAPS } from '../../engine/config';
import { fmtDay, fmtTime, PhotoTile } from '../../components/bits';

/* ============================================================================
   Rider application — separate from customer registration by design.
   Requires matriculation number, student ID upload, emergency contact,
   transport details and explicit acceptance of rider terms. Every application
   is manually reviewed; no unapproved applicant can receive offers.
   ========================================================================== */

const STEPS = ['Identity', 'Documents', 'Transport', 'Terms'];

export default function RiderApply() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const navigate = useNavigate();
  const user = currentUser(state)!;

  const existing = state.applications.find((a) => a.userId === user.id);
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(user.name);
  const [matric, setMatric] = useState('');
  const [phone, setPhone] = useState(user.phone);
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const [transport, setTransport] = useState<'foot' | 'bicycle' | 'motorcycle'>('bicycle');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const [terms, setTerms] = useState(false);
  const [safety, setSafety] = useState(false);

  /* status screen for existing applications */
  if (existing) {
    const notes = [...existing.reviewNotes].reverse();
    return (
      <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <h1>Rider application</h1>
        <Card className="stack">
          <div className="row-between">
            <span className="mono" style={{ fontWeight: 700 }}>{existing.id.toUpperCase()}</span>
            <span className={`pill ${existing.status === 'approved' ? 'pill-go' : existing.status === 'rejected' ? 'pill-alert' : 'pill-wait'}`}>
              {existing.status.replace('_', ' ')}
            </span>
          </div>
          <Banner tone={existing.status === 'approved' ? 'success' : 'info'} icon={existing.status === 'approved' ? Check : FileCheck2}>
            {existing.status === 'approved'
              ? 'You are verified. Set availability from your dashboard to start receiving offers.'
              : existing.status === 'under_review'
                ? 'Manual review in progress. We verify the matriculation number against records and check the ID document. You cannot accept deliveries until approved.'
                : existing.status === 'info_required'
                  ? 'We need more information — see the note below.'
                  : 'Application under review.'}
          </Banner>
          {existing.status === 'approved' && (
            <Button onClick={() => navigate('/rider')}>Open rider dashboard</Button>
          )}
          {notes.length > 0 && (
            <div className="stack-sm">
              <div className="data-label">Review notes</div>
              {notes.map((n, i) => (
                <div key={i} className="card card-tint" style={{ padding: 10, fontSize: 'var(--text-sm)' }}>
                  <div className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>
                    {fmtDay(n.at, state.clock.epoch)} {fmtTime(n.at)} · {n.by}
                  </div>
                  {n.note}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const errors: Record<number, string[]> = {
    0: [
      ...(!fullName.trim() ? ['Full name required'] : []),
      ...(!/^UNIOSUN\/[A-Z]{2,6}\/\d{4}\/\d{3,5}$/i.test(matric.trim()) ? ['Matric number must look like UNIOSUN/SCI/2021/0142'] : []),
      ...(!phone.trim() ? ['Phone number required'] : []),
    ],
    1: [...(!idDoc ? ['Upload a photo of your valid UNIOSAN student ID card'] : [])],
    2: [...(!ecName.trim() || !ecPhone.trim() || !ecRel.trim() ? ['Complete emergency contact details'] : [])],
    3: [...(!terms ? ['Accept the rider terms and package-handling rules'] : []), ...(!safety ? ['Accept the safety requirements'] : [])],
  };

  function submit() {
    dispatch({
      type: 'rider/submitApplication',
      app: {
        userId: user.id,
        fullName,
        matricNumber: matric.trim().toUpperCase(),
        studentIdDoc: idDoc!,
        phone,
        emergencyContact: { name: ecName, phone: ecPhone, relationship: ecRel },
        transport,
        zoneId: user.zoneId,
        termsAcceptedAt: state.clock.epoch,
      },
    });
    toast('Application submitted — manual review starts now.', 'success');
    navigate('/rider/apply');
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div>
        <h1>Become a ROOT-X rider</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Only verified UNIOSUN students can carry deliveries. Applications are manually reviewed — matriculation number, student
          ID and emergency contact are required.
        </p>
      </div>

      <Card>
        <Stepper steps={STEPS} current={step} />
      </Card>

      {step === 0 && (
        <Card className="stack">
          <Banner tone="info" icon={ShieldCheck}>
            Your matriculation number and documents are visible only to authorised review staff — never to customers.
          </Banner>
          <Field label="Full name (as on your student ID)" required>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Matriculation number" required hint="Format: UNIOSUN/FACULTY/YEAR/NUMBER — verified against university records during review.">
            <TextInput value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="UNIOSUN/SCI/2021/0142" />
          </Field>
          <Field label="Phone number" required hint="Must be verified — we send a code before approval.">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
        </Card>
      )}

      {step === 1 && (
        <Card className="stack">
          <Field label="Valid UNIOSUN student ID card" required hint="Front side, all corners visible. Stored in private storage with restricted access.">
            <div style={{ display: 'flex', gap: 8 }}>
              {idDoc && <PhotoTile src={idDoc} alt="Student ID card" onRemove={() => setIdDoc(null)} />}
              <label className="btn btn-secondary btn-md" style={{ height: 64, flexDirection: 'column', gap: 2, fontSize: 'var(--text-2xs)', width: 110 }}>
                <Camera size={18} />
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const rd = new FileReader();
                    rd.onload = () => setIdDoc(String(rd.result));
                    rd.readAsDataURL(f);
                  }}
                />
              </label>
              <button className="btn btn-ghost btn-md" style={{ height: 64, flexDirection: 'column', gap: 2, fontSize: 'var(--text-2xs)' }} onClick={() => setIdDoc(svgPhoto('STUDENT ID CARD', '#4a5568', 'sample document'))}>
                <FileCheck2 size={18} />
                Sample doc
              </button>
            </div>
          </Field>
        </Card>
      )}

      {step === 2 && (
        <Card className="stack">
          <Field label="Transport method" required hint="Determines capacity limits and matching eligibility. Vehicle documents may be required for motorcycles.">
            <Select value={transport} onChange={(e) => setTransport(e.target.value as typeof transport)}>
              {Object.entries(TRANSPORT_CAPS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} — up to {v.kg} kg
                </option>
              ))}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Emergency contact name" required>
              <TextInput value={ecName} onChange={(e) => setEcName(e.target.value)} />
            </Field>
            <Field label="Their phone" required>
              <TextInput value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} inputMode="tel" />
            </Field>
          </div>
          <Field label="Relationship" required>
            <TextInput value={ecRel} onChange={(e) => setEcRel(e.target.value)} placeholder="e.g. Brother, Guardian" />
          </Field>
        </Card>
      )}

      {step === 3 && (
        <Card className="stack">
          <label className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17, accentColor: 'var(--root-600)' }} />
            <span>
              I accept the rider terms: package-handling rules, privacy requirements (no sharing customer data or photos),
              conduct standards and honest status updates. I understand prohibited items must be refused at pickup and reported.
            </span>
          </label>
          <label className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={safety} onChange={(e) => setSafety(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17, accentColor: 'var(--root-600)' }} />
            <span>
              I accept the safety requirements: service closes at 9 PM, I use the SOS control for danger, and safety-related
              pauses never count against me. I share my location only during active deliveries.
            </span>
          </label>
          <TextArea readOnly value={'Working hours default to 8 AM – 6:30 PM with the 6 PM notice. Re-verification is required each session/year per policy.'} aria-label="Working hours note" style={{ background: 'var(--canvas-tint)' }} />
        </Card>
      )}

      {errors[step].length > 0 && (
        <Banner tone="danger" title="Fix before continuing">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors[step].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Banner>
      )}

      <div className="row" style={{ gap: 10 }}>
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button style={{ flex: 1 }} disabled={errors[step].length > 0} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button style={{ flex: 1 }} disabled={errors[3].length > 0} onClick={submit}>
            Submit application
          </Button>
        )}
      </div>
    </div>
  );
}
