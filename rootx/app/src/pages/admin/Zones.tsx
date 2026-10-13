import React, { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { SchematicMap } from '../../components/SchematicMap';
import { OSOGBO_CAMPUS, OKE_BAAALE } from '../../engine/zones';
import { fmtNaira } from '../../engine/ledger';

export default function AdminZones() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  function toggle(zoneId: string, next: boolean) {
    if (!reason.trim()) {
      setReasonFor(zoneId);
      return;
    }
    dispatch({ type: 'admin/zoneActive', zoneId, active: next, reason });
    toast(`Zone ${next ? 'activated' : 'suspended'} — audit entry recorded.`, 'success');
    setReason('');
    setReasonFor(null);
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>Zones &amp; landmarks</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Approved service areas. Boundaries are demo geometry — production stores surveyed polygons in PostGIS with GPS-buffered
          edge handling and an exception-review path for edge cases.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.4fr) minmax(260px, 1fr)', gap: 16 }} className="zones-grid">
        <style>{`@media (max-width: 900px){ .zones-grid{grid-template-columns: 1fr !important} }`}</style>
        <SchematicMap
          zones={[OSOGBO_CAMPUS, OKE_BAAALE]}
          height={360}
          showAllLandmarkLabels
          caption="Osogbo campus + Oke-Baale township (schematic). Restricted areas are hatched. Tap zones below to manage."
        />
        <div className="stack-sm">
          {[OSOGBO_CAMPUS, OKE_BAAALE].map((z) => {
            const active = state.config.zonesActive[z.id] !== false && z.active;
            return (
              <Card key={z.id} className="stack-sm">
                <div className="row-between">
                  <div>
                    <strong>{z.name}</strong>
                    <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                      {z.campus} · {z.kind} · {z.landmarks.length} landmarks
                    </span>
                  </div>
                  <span className={`pill ${active ? 'pill-go' : 'pill-hold'}`}>{active ? 'Active' : 'Suspended'}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button size="sm" variant={active ? 'quiet-danger' : 'primary'} onClick={() => (active ? toggle(z.id, false) : toggle(z.id, true))}>
                    {active ? 'Suspend zone' : 'Activate zone'}
                  </Button>
                  <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>
                    Hours {z.hours.open}:00–{z.hours.close}:00
                  </span>
                </div>
              </Card>
            );
          })}
          <Banner tone="info">
            Inter-zone policy: <strong>{state.config.policies.interZonePolicy.replace(/_/g, ' ')}</strong> — inter-campus delivery is
            disabled pending approval (change it in Pricing &amp; hours).
          </Banner>
        </div>
      </div>

      <div className="table-wrap scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Campus</th>
              <th>Kind</th>
              <th>Landmarks</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'osogbo-campus', name: 'Osogbo Campus', campus: 'Osogbo (Main)', kind: 'campus', landmarks: OSOGBO_CAMPUS.landmarks.length, hours: OSOGBO_CAMPUS.hours },
              { id: 'oke-baale', name: 'Oke-Baale Township', campus: 'Osogbo (Main)', kind: 'township', landmarks: OKE_BAAALE.landmarks.length, hours: OKE_BAAALE.hours },
              { id: 'ikire-campus', name: 'Ikire Campus', campus: 'Ikire', kind: 'campus', landmarks: 3, hours: { open: 8, close: 21 } },
              { id: 'ifetedo-campus', name: 'Ifetedo Campus', campus: 'Ifetedo', kind: 'campus', landmarks: 2, hours: { open: 8, close: 21 } },
              { id: 'ipetu-campus', name: 'Ipetu-Ijesa Campus', campus: 'Ipetu-Ijesa', kind: 'campus', landmarks: 1, hours: { open: 8, close: 21 } },
              { id: 'ejigbo-campus', name: 'Ejigbo Campus', campus: 'Ejigbo', kind: 'campus', landmarks: 1, hours: { open: 8, close: 21 } },
              { id: 'okuku-campus', name: 'Okuku Campus', campus: 'Okuku', kind: 'campus', landmarks: 1, hours: { open: 8, close: 20 } },
            ].map((z) => {
              const active = state.config.zonesActive[z.id] !== false;
              return (
                <tr key={z.id}>
                  <td><strong>{z.name}</strong></td>
                  <td>{z.campus}</td>
                  <td>{z.kind}</td>
                  <td className="mono">{z.landmarks}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{z.hours.open}:00–{z.hours.close}:00</td>
                  <td>
                    <span className={`pill ${active ? 'pill-go' : 'pill-hold'}`}>{active ? 'active' : 'suspended'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="stack-sm">
        <div className="data-label">Landmark directory (Osogbo campus)</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {OSOGBO_CAMPUS.landmarks.map((l) => (
            <span key={l.id} className="pill pill-hold">
              <MapPin size={11} /> {l.name}
            </span>
          ))}
        </div>
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => toast('Landmark editor: production supports adding/editing landmarks per zone with audit + review before publish (demo).', 'info')}>
          Add landmark
        </Button>
        <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
          Zone and landmark changes take effect without rebuilding the app — they are configuration, not code. Minimum fare in this
          zone: {fmtNaira(state.config.pricing.minFare)}.
        </p>
      </Card>

      <Modal
        open={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title="Zone change requires a reason"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonFor(null)}>Cancel</Button>
            <Button disabled={!reason.trim()} onClick={() => reasonFor && toggle(reasonFor, state.config.zonesActive[reasonFor] === false)}>
              Save with audit entry
            </Button>
          </>
        }
      >
        <Field label="Reason (recorded as {actor.name} · zone change · timestamp)" required>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Okuku zone suspended pending boundary survey and staff coverage" />
        </Field>
      </Modal>
    </div>
  );
}
