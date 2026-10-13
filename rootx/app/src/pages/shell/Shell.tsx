import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, History, LayoutGrid, LogOut, Package, Plus, Star, User, Wallet, Home as HomeIcon } from 'lucide-react';
import { useRootX, useDispatchRootX, useNet, currentUser, unreadCount, serviceWindowNow } from '../../engine/store';
import { Avatar, Banner, IconButton, type IconType } from '../../ds';
import { ServiceStatusChip } from '../../components/bits';
import { Logo } from '../auth/Login';

/* ============================================================================
   Shell — mobile-first customer/rider frame: header + bottom tab bar on
   phones, top navigation on wider screens. Admin uses its own shell.
   ========================================================================== */

export default function Shell() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const navigate = useNavigate();
  const net = useNet();
  const user = currentUser(state)!;
  const isRider = user.role === 'rider';
  const unread = unreadCount(state, user.id);
  const w = serviceWindowNow(state);

  const nav = isRider
    ? [
        { to: '/rider', label: 'Today', icon: HomeIcon, end: true },
        { to: '/rider/earnings', label: 'Earnings', icon: Wallet },
        { to: '/rider/performance', label: 'Performance', icon: Star },
        { to: '/profile', label: 'You', icon: User },
      ]
    : [
        { to: '/home', label: 'Home', icon: HomeIcon, end: true },
        { to: '/deliveries', label: 'Deliveries', icon: Package },
        { to: '/wallet', label: 'Wallet', icon: Wallet },
        { to: '/profile', label: 'You', icon: User },
      ];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'oklch(1 0 0 / 0.85)',
          backdropFilter: 'blur(14px) saturate(1.5)',
          borderBottom: '1px solid var(--line-subtle)',
        }}
      >
        <div className="row-between" style={{ maxWidth: 880, marginInline: 'auto', padding: '10px 16px', gap: 12 }}>
          <button onClick={() => navigate(isRider ? '/rider' : '/home')} style={{ border: 'none', background: 'none', padding: 0 }} aria-label="ROOT-X home">
            <Logo size={26} />
          </button>
          <div className="row" style={{ gap: 4 }}>
            <ServiceStatusChip phase={w.phase} time={fmtClock(state.clock.epoch)} />
            <IconButton label={`Notifications${unread ? ` (${unread} unread)` : ''}`} icon={Bell} onClick={() => navigate('/notifications')} />
            {unread > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'relative',
                  right: 44,
                  top: -12,
                  background: 'var(--alert-600)',
                  color: 'white',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingInline: 3,
                }}
              >
                {unread}
              </span>
            )}
            <NetBadge />
            <AccountMenu name={user.name} onLogout={() => dispatch({ type: 'auth/logout' })} />
          </div>
        </div>

        {/* desktop nav */}
        <nav className="shell-desktop-nav" aria-label="Primary" style={{ display: 'none' }}>
          <div style={{ maxWidth: 880, marginInline: 'auto', padding: '0 16px 8px', display: 'flex', gap: 4 }}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end as never} className="shell-nav-link">
                <n.icon size={16} /> {n.label}
              </NavLink>
            ))}
            {!isRider && (
              <NavLink to="/new" className="shell-nav-link shell-nav-cta">
                <Plus size={16} /> New delivery
              </NavLink>
            )}
            {isRider && (
              <NavLink to="/support" className="shell-nav-link">
                <History size={16} /> Support
              </NavLink>
            )}
          </div>
        </nav>
        <style>{`
          @media (min-width: 768px){ .shell-desktop-nav{display:block !important} .shell-bottom-nav{display:none !important} }
          .shell-nav-link{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;font-size:var(--text-sm);font-weight:600;color:var(--ink-2);text-decoration:none}
          .shell-nav-link:hover{background:var(--canvas-tint);color:var(--ink)}
          .shell-nav-link.active{background:var(--root-50);color:var(--root-800)}
          .shell-nav-cta.active{background:var(--root-600);color:white}
        `}</style>
      </header>

      {!net.online && (
        <div style={{ padding: '0 12px', maxWidth: 880, marginInline: 'auto', width: '100%', marginTop: 10 }}>
          <Banner tone="warn" title="You're offline">
            You can keep working — safe status updates are queued and will sync when the connection returns. Payments and
            verification always wait for confirmation; nothing is assumed.
            {net.queued > 0 && (
              <span className="mono" style={{ display: 'block', marginTop: 4 }}>
                {net.queued} update(s) queued
              </span>
            )}
          </Banner>
        </div>
      )}

      {/* content */}
      <main style={{ flex: 1, width: '100%', maxWidth: 880, marginInline: 'auto', padding: '16px 16px 96px' }}>
        <Outlet />
      </main>

      {/* bottom nav (mobile) */}
      <nav
        className="shell-bottom-nav"
        aria-label="Primary"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'oklch(1 0 0 / 0.92)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--line-subtle)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '6px 8px calc(6px + env(safe-area-inset-bottom, 0px))',
          zIndex: 60,
        }}
      >
        {isRider ? (
          nav.map((n) => <BottomItem key={n.to} to={n.to} label={n.label} icon={n.icon} end={n.end} />)
        ) : (
          <>
            <BottomItem to="/home" label="Home" icon={HomeIcon} end />
            <BottomItem to="/deliveries" label="Deliveries" icon={Package} />
            <NavLink
              to="/new"
              aria-label="New delivery"
              style={{
                width: 54,
                height: 54,
                marginTop: -18,
                borderRadius: '50%',
                background: 'var(--root-600)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px oklch(0.54 0.21 295 / 0.32)',
                border: '3px solid var(--surface)',
                textDecoration: 'none',
              }}
            >
              <Plus size={24} strokeWidth={2.5} />
            </NavLink>
            <BottomItem to="/wallet" label="Wallet" icon={Wallet} />
            <BottomItem to="/profile" label="You" icon={User} />
          </>
        )}
      </nav>

    </div>
  );
}

function BottomItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: IconType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '6px 12px',
        borderRadius: 12,
        color: isActive ? 'var(--root-700)' : 'var(--ink-3)',
        textDecoration: 'none',
        fontSize: 'var(--text-2xs)',
        fontWeight: 700,
        minWidth: 64,
      })}
    >
      <Icon size={21} strokeWidth={2.2} />
      {label}
    </NavLink>
  );
}

function AccountMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dispatch = useDispatchRootX();
  const navigate = useNavigate();
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" style={{ width: 44 }}>
        <Avatar name={name} size={30} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 48,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
            minWidth: 230,
            zIndex: 80,
          }}
        >
          <div style={{ padding: '8px 10px', fontSize: 'var(--text-sm)', fontWeight: 700 }}>{name}</div>
          <div style={{ padding: '8px 10px 4px', fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Switch account
          </div>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.id}
              className="btn btn-ghost btn-sm btn-block"
              style={{ justifyContent: 'flex-start', fontWeight: a.name === name ? 700 : 500 }}
              role="menuitem"
              onClick={() => {
                dispatch({ type: 'auth/quickLogin', userId: a.id });
                setOpen(false);
                navigate('/');
              }}
            >
              <Avatar name={a.name} size={22} /> {a.name}
              <span className="muted" style={{ fontSize: 'var(--text-2xs)', marginLeft: 'auto' }}>{a.role}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '6px 4px' }} />
          <button className="btn btn-ghost btn-sm btn-block" style={{ justifyContent: 'flex-start' }} role="menuitem" onClick={onLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { id: 'u-ada', name: 'Ada Obi', role: 'Customer' },
  { id: 'u-tunde', name: 'Tunde Bakare', role: 'Customer' },
  { id: 'u-chidi', name: 'Chidi Okafor', role: 'Rider' },
  { id: 'u-amaka', name: 'Amaka Eze', role: 'Applicant' },
  { id: 'u-admin', name: 'Mrs. Bello', role: 'Admin' },
  { id: 'u-finance', name: 'Mr. Adeyemi', role: 'Finance' },
];

/** Honest connectivity indicator: offline state and queued actions are shown,
 *  never hidden (constraint C-8). */
function NetBadge() {
  const net = useNet();
  if (net.online && net.queued === 0) return null;
  return (
    <span className="pill" style={{ background: 'var(--status-wait-bg)', color: 'var(--status-wait-fg)', fontSize: 'var(--text-2xs)', fontWeight: 700 }}>
      {net.online ? `Syncing ${net.queued}…` : 'Offline — will retry'}
    </span>
  );
}

export { LayoutGrid };

function fmtClock(epoch: number): string {
  return new Date(epoch).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}
