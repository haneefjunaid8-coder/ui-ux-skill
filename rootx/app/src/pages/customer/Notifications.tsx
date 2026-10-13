import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CreditCard, LifeBuoy, Package, ShieldAlert, UserCog } from 'lucide-react';
import { Button, Card, EmptyState, type IconType } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { fmtDay, fmtTime } from '../../components/bits';

const ICONS: Record<string, IconType> = {
  delivery: Package,
  payment: CreditCard,
  safety: ShieldAlert,
  account: UserCog,
  system: LifeBuoy,
};

export default function Notifications() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const now = state.clock.epoch;
  const mine = state.notifications.filter((n) => n.userId === user.id || n.userId === null);

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="row-between">
        <h1>Notifications</h1>
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'notifications/read', ids: mine.map((n) => n.id) })}>
          Mark all read
        </Button>
      </div>

      {mine.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="Nothing yet" body="Delivery updates, payment receipts and safety notices will appear here." />
        </Card>
      ) : (
        <div className="stack-sm">
          {mine.map((n) => {
            const Icon = ICONS[n.category] ?? Bell;
            return (
              <Card
                key={n.id}
                className="row"
                style={{
                  gap: 12,
                  alignItems: 'flex-start',
                  borderColor: n.read ? undefined : 'var(--root-200)',
                  background: n.read ? undefined : 'var(--root-50)',
                  cursor: n.deliveryId ? 'pointer' : undefined,
                }}
                onClick={n.deliveryId ? () => navigate(`/deliveries/${n.deliveryId}`) : undefined}
              >
                <span style={{ color: n.category === 'safety' ? 'var(--dusk-700)' : 'var(--root-700)', flexShrink: 0, marginTop: 2 }}>
                  <Icon size={19} />
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{n.title}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{n.body}</div>
                  <div className="faint mono" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                    {fmtDay(n.at, now)} · {fmtTime(n.at)} {n.userId === null && '· broadcast'}
                  </div>
                </div>
                {!n.read && <span aria-label="unread" style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--root-600)', flexShrink: 0, marginTop: 6 }} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
