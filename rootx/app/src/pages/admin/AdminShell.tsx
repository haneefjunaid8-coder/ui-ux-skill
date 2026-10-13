import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Banknote,
  Boxes,
  FileClock,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPinned,
  Scale,
  Tags,
} from 'lucide-react';
import { useRootX, useDispatchRootX, useNet, currentUser, serviceWindowNow } from '../../engine/store';
import { Avatar } from '../../ds';
import { ServiceStatusChip } from '../../components/bits';
import { Logo } from '../auth/Login';
import { fmtNaira } from '../../engine/ledger';

/* ============================================================================
   AdminShell — the operations workspace. Sidebar navigation serves content
   (260px, same canvas + quiet border). Finance staff see only their section —
   permissions are enforced in the store, not just hidden here.
   ========================================================================== */

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'finance'], end: true },
  { to: '/admin/applications', label: 'Rider applications', icon: BadgeCheck, roles: ['admin'], end: false },
  { to: '/admin/deliveries', label: 'Deliveries', icon: Boxes, roles: ['admin', 'finance'], end: false },
  { to: '/admin/zones', label: 'Zones & landmarks', icon: MapPinned, roles: ['admin'], end: false },
  { to: '/admin/pricing', label: 'Pricing & hours', icon: Tags, roles: ['admin'], end: false },
  { to: '/admin/finance', label: 'Finance', icon: Banknote, roles: ['admin', 'finance'], end: false },
  { to: '/admin/cases', label: 'Cases & safety', icon: LifeBuoy, roles: ['admin'], end: false },
  { to: '/admin/audit', label: 'Audit log', icon: FileClock, roles: ['admin', 'finance'], end: false },
];

export default function AdminShell() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const w = serviceWindowNow(state);
  const pendingApps = state.applications.filter((a) => ['submitted', 'under_review'].includes(a.status)).length;
  const openCases = state.disputes.filter((c) => c.status !== 'resolved').length + state.incidents.filter((i) => i.status !== 'resolved').length;
  const batchesPending = state.batches.filter((b) => b.status === 'awaiting_approval').length;

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: 'var(--admin-sidebar) 1fr' }}>
      <style>{`@media (max-width: 900px){ .admin-layout{grid-template-columns: 1fr !important} .admin-side{display:none !important} }`}</style>
      <div className="admin-layout" style={{ display: 'grid', gridTemplateColumns: 'var(--admin-sidebar) 1fr', minHeight: '100dvh', width: '100%' }}>
        <aside
          className="admin-side"
          style={{
            borderRight: '1px solid var(--line-subtle)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'var(--surface-sunken)',
            position: 'sticky',
            top: 0,
            height: '100dvh',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '8px 10px 18px' }}>
            <Logo size={26} />
          </div>
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'admin-nav-item' + (isActive ? ' active' : '')}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 10,
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: isActive ? 'var(--root-800)' : 'var(--ink-2)',
                background: isActive ? 'var(--root-50)' : 'transparent',
                textDecoration: 'none',
              })}
            >
              <n.icon size={17} />
              <span className="grow">{n.label}</span>
              {n.to === '/admin/applications' && pendingApps > 0 && <span className="pill pill-wait">{pendingApps}</span>}
              {n.to === '/admin/cases' && openCases > 0 && <span className="pill pill-alert">{openCases}</span>}
              {n.to === '/admin/finance' && batchesPending > 0 && <span className="pill pill-wait">{batchesPending}</span>}
            </NavLink>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--line-subtle)' }} className="stack-sm">
            <div className="row" style={{ gap: 10 }}>
              <Avatar name={user.name} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div className="faint" style={{ fontSize: 'var(--text-xs)' }}>{user.role === 'finance' ? 'Finance staff' : 'Operations admin'}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm btn-block" style={{ justifyContent: 'flex-start' }} onClick={() => dispatch({ type: 'auth/logout' })}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              background: 'oklch(1 0 0 / 0.88)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--line-subtle)',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div className="row" style={{ gap: 8 }}>
              <ServiceStatusChip phase={w.phase} time={new Date(state.clock.epoch).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })} />
              <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>
                pricing config v{state.config.version} · commission {state.config.pricing.commissionPct}%
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>
              <Scale size={14} /> demo org · all data fictional
            </button>
          </header>
          <main style={{ padding: 'clamp(16px, 3vw, 28px)', maxWidth: 1160, width: '100%', marginInline: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export { fmtNaira };
