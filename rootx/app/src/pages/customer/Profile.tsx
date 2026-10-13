import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Download, Landmark, ShieldCheck, Trash2 } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextInput, Toggle, useToast } from '../../ds';
import { useRootX, currentUser } from '../../engine/store';
import { Avatar } from '../../ds';

export default function Profile() {
  const state = useRootX();
  const toast = useToast();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const isRider = user.role === 'rider';
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <Card className="row" style={{ gap: 14 }}>
        <Avatar name={user.name} size={54} />
        <div className="grow">
          <h1 style={{ fontSize: 'var(--text-lg)' }}>{user.name}</h1>
          <div className="faint mono" style={{ fontSize: 'var(--text-sm)' }}>{user.phone}</div>
          <span className="pill pill-hold" style={{ marginTop: 4 }}>
            {isRider ? 'Verified student rider' : 'Member'} · {user.zoneId.replace(/-/g, ' ')}
          </span>
        </div>
      </Card>

      {isRider && (
        <Card className="stack-sm">
          <div className="row-between">
            <div>
              <strong>Rider verification</strong>
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Matriculation number and student ID are on file — hidden from other users.</p>
            </div>
            <ShieldCheck size={22} style={{ color: 'var(--root-600)' }} />
          </div>
          <Button variant="secondary" size="sm" icon={Bike} onClick={() => navigate('/rider')}>
            Open rider dashboard
          </Button>
        </Card>
      )}

      <Card className="stack-sm">
        <div className="data-label">Saved places</div>
        {user.savedLocations.map((sl) => (
          <div key={sl.id} className="row-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-subtle)' }}>
            <span className="row" style={{ gap: 8, fontSize: 'var(--text-sm)' }}>
              <Landmark size={15} className="faint" /> {sl.label}
            </span>
            <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>{sl.zoneId === 'osogbo-campus' ? 'Campus' : 'Township'}</span>
          </div>
        ))}
        {user.savedLocations.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No saved places yet — save them while booking.</p>}
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Notifications</div>
        {(['push', 'sms', 'email'] as const).map((ch) => (
          <label key={ch} className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
            <span>
              {ch.toUpperCase()}
              {(ch === 'sms' || ch === 'push') && <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>Security, transaction and safety notices always stay on.</span>}
            </span>
            <Toggle checked={user.notifyPrefs[ch]} onChange={() => toast('Preference saved (demo — not persisted in the prototype store).')} label={`${ch} notifications`} />
          </label>
        ))}
      </Card>

      <Card className="stack-sm">
        <div className="data-label">Privacy &amp; data</div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Location is collected only for active deliveries and stopped on completion. Identity documents, matriculation details and
          emergency contacts are never shown to other users.
        </p>
        <div className="row wrap" style={{ gap: 8 }}>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => toast('Data export would be generated per NDPA subject-access request timelines (demo).', 'info')}>
            Export my data
          </Button>
          <Button variant="quiet-danger" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <Banner tone="info">
        Prototype note: changes here are illustrative. The production privacy model (retention limits, deletion workflow,
        consent records) is specified in docs/12-security-privacy.md.
      </Banner>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Keep account</Button>
            <Button variant="destructive" onClick={() => { setDeleteOpen(false); toast('Demo: deletion would require settling active deliveries and payouts first.', 'warn'); }}>
              Delete anyway
            </Button>
          </>
        }
      >
        <Banner tone="warn">
          Account deletion is blocked while you have active deliveries, pending disputes or unsettled balances. Financial
          records are retained per regulation even after deletion; personal data is removed per the retention schedule.
        </Banner>
      </Modal>
    </div>
  );
}
