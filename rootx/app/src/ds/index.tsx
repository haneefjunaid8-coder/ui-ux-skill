import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Shared icon prop type — matches lucide-react components. */
export type IconType = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
}>;
import { AlertTriangle, Check, Info, Loader2, X } from 'lucide-react';

/* ============================================================================
   ROOT-X component library. Tokens live in styles/tokens.css; component
   styles in styles/ds.css. Status is always communicated by icon + label +
   colour (never colour alone).
   ========================================================================== */

/* ---- Button ---------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'quiet-danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon: Icon,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: IconType;
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="spin" /> : Icon ? <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, icon: Icon, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconType }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon size={20} strokeWidth={2} />
    </button>
  );
}

/* ---- Fields ------------------------------------------------------------------ */

export function Field({
  label,
  required,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="field-required" aria-hidden="true" title="Required" />}
      </label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={htmlFor ? htmlFor + '-hint' : undefined}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          <AlertTriangle size={13} strokeWidth={2.5} /> {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className="input" aria-invalid={invalid || undefined} {...rest} />;
}

export function TextArea({ invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className="textarea" aria-invalid={invalid || undefined} {...rest} />;
}

export function Select({ invalid, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className="select" aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
}

/* ---- Toggle -------------------------------------------------------------------- */

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => onChange(!checked)}
    />
  );
}

/* ---- SegmentedControl ------------------------------------------------------------- */

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: IconType }[]; ariaLabel: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className="segment" onClick={() => onChange(o.value)}>
          {o.icon ? <o.icon size={14} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---- RadioCard ---------------------------------------------------------------------- */

export function RadioCard({ selected, onSelect, title, desc, icon: Icon, meta }: { selected: boolean; onSelect: () => void; title: string; desc?: string; icon?: IconType; meta?: React.ReactNode }) {
  return (
    <button type="button" className="radio-card" data-selected={selected} aria-pressed={selected} onClick={onSelect}>
      <span className="radio-dot" aria-hidden="true" />
      {Icon && (
        <span style={{ color: selected ? 'var(--root-600)' : 'var(--ink-3)', marginTop: 2 }}>
          <Icon size={20} />
        </span>
      )}
      <span className="grow">
        <span style={{ fontWeight: 700, display: 'block' }}>{title}</span>
        {desc && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', display: 'block', marginTop: 2 }}>{desc}</span>
        )}
        {meta}
      </span>
    </button>
  );
}

/* ---- Card --------------------------------------------------------------------------- */

export function Card({ children, className = '', onClick, pad = true, style }: { children: React.ReactNode; className?: string; onClick?: () => void; pad?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`card ${onClick ? 'card-clickable' : ''} ${pad ? '' : 'card-pad-lg'} ${className}`} style={style} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}>
      {children}
    </div>
  );
}

/* ---- StatusPill ------------------------------------------------------------------------ */

export type PillTone = 'go' | 'motion' | 'wait' | 'hold' | 'alert';

export function Pill({ tone, icon: Icon, children }: { tone: PillTone; icon?: IconType; children: React.ReactNode }) {
  return (
    <span className={`pill pill-${tone}`}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/* ---- Banner -------------------------------------------------------------------------- */

export function Banner({ tone = 'info', title, children, icon: Icon }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: string; children: React.ReactNode; icon?: IconType }) {
  const icons = { info: Info, warn: AlertTriangle, danger: AlertTriangle, success: Check };
  const I = Icon ?? icons[tone];
  return (
    <div className={`banner banner-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <I size={17} strokeWidth={2.2} />
      <div>
        {title && <strong className="banner-title">{title}</strong>}
        {children}
      </div>
    </div>
  );
}

/* ---- Modal ------------------------------------------------------------------------------ */

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---- Tabs ---------------------------------------------------------------------------------- */

export function Tabs<T extends string>({ value, onChange, tabs, ariaLabel }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[]; ariaLabel: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.label || value === t.value} className="tab" onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="faint" style={{ marginLeft: 6 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---- Stepper (route thread) ------------------------------------------------------------------- */

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <div className="stepper-thread" data-done={i <= current} />}
          <div className="stepper-step" data-state={i < current ? 'done' : i === current ? 'current' : 'todo'}>
            <div className="stepper-node" aria-hidden="true">
              {i < current ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            <div className="stepper-label">{s}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---- EmptyState --------------------------------------------------------------------------------- */

export function EmptyState({ title, body, action, icon: Icon }: { title: string; body?: string; action?: React.ReactNode; icon?: IconType }) {
  return (
    <div className="empty">
      {Icon ? (
        <Icon size={36} strokeWidth={1.6} />
      ) : (
        <svg width="120" height="44" viewBox="0 0 120 44" fill="none" aria-hidden="true">
          <path d="M4 36 C 30 36, 34 10, 58 10" stroke="var(--root-400)" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
          <path d="M58 10 C 84 10, 88 28, 112 28" stroke="var(--root-400)" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
          <circle cx="58" cy="10" r="5" fill="var(--root-200)" stroke="var(--root-600)" strokeWidth="2" />
          <path d="M112 20 l8 8 -8 8" stroke="var(--root-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

/* ---- Stat ---------------------------------------------------------------------------------------- */

export function Stat({ label, value, delta, tone }: { label: string; value: React.ReactNode; delta?: string; tone?: 'go' | 'alert' | 'wait' }) {
  return (
    <div className="card stat">
      <div className="data-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && (
        <div className={`stat-delta ${tone === 'go' ? '' : ''}`} style={{ color: tone === 'go' ? 'var(--root-700)' : tone === 'alert' ? 'var(--alert-700)' : tone === 'wait' ? 'var(--dusk-700)' : 'var(--ink-3)' }}>
          {delta}
        </div>
      )}
    </div>
  );
}

/* ---- Avatar ---------------------------------------------------------------------------------------- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  );
}

/* ---- OTP-style code input ----------------------------------------------------------------------------- */

export function CodeInput({ length = 6, value, onChange, label }: { length?: number; value: string; onChange: (v: string) => void; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  return (
    <div className="code-input" role="group" aria-label={label}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ''}
          aria-label={`${label} digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '');
            const next = (value.slice(0, i) + ch + value.slice(i + 1)).slice(0, length);
            onChange(next);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

/* ---- Toasts --------------------------------------------------------------------------------------------- */

interface Toast {
  id: number;
  msg: string;
  tone: 'default' | 'info' | 'success' | 'warn' | 'error';
}
const ToastCtx = createContext<(msg: string, tone?: Toast['tone']) => void>(null!);
let toastSeq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: Toast['tone'] = 'default') => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone === 'default' || t.tone === 'info' ? 'default' : t.tone}`} role="status">
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* ---- misc ------------------------------------------------------------------------------------------------- */

export function KV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="kv-key">{k}</span>
      <span className="kv-val">{v}</span>
    </div>
  );
}

export function Skeleton({ w = '100%', h = 16 }: { w?: number | string; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} aria-hidden="true" />;
}
