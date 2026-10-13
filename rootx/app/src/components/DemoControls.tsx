import React, { useState } from 'react';
import { FlaskConical, RotateCcw, WifiOff, Wifi, SignalHigh, CreditCard, MapPinOff } from 'lucide-react';
import { Button, Toggle, type IconType } from '../ds';
import { useRootX, useDispatchRootX, serviceWindowNow } from '../engine/store';
import { fmtTime } from './bits';

/* ============================================================================
   DemoControls — prototype-only tooling, styled deliberately as tooling
   (mono type, dashed border) so it never reads as product UI. It drives the
   simulation clock so the 6 PM / 9 PM safety rules can be demonstrated at any
   time, plus poor-network / stale-GPS / failed-payment toggles.
   ========================================================================== */

const TIME_PRESETS = [
  { label: '10:00 AM', h: 10, m: 0 },
  { label: '5:45 PM', h: 17, m: 45 },
  { label: '6:00 PM', h: 18, m: 0 },
  { label: '8:15 PM', h: 20, m: 15 },
  { label: '9:00 PM', h: 21, m: 0 },
  { label: '9:40 PM', h: 21, m: 40 },
];

export function DemoControls() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const [open, setOpen] = useState(false);
  const w = serviceWindowNow(state);

  function preset(h: number, m: number) {
    const d = new Date(state.clock.epoch);
    d.setHours(h, m, 0, 0);
    dispatch({ type: 'clock/set', epoch: d.getTime() });
  }

  return (
    <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 120 }}>
      {open && (
        <div
          className="stack"
          style={{
            background: 'var(--surface)',
            border: '1.5px dashed var(--root-400)',
            borderRadius: 'var(--r-lg)',
            padding: 16,
            width: 290,
            boxShadow: 'var(--shadow-lg)',
            marginBottom: 8,
          }}
          role="group"
          aria-label="Prototype demo controls"
        >
          <div className="row-between">
            <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FlaskConical size={13} /> PROTOTYPE CONTROLS
            </span>
            <span className="mono" style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>
              {fmtTime(state.clock.epoch)} · {w.phase.toUpperCase()}
            </span>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Simulation clock — jump to</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="btn btn-sm btn-secondary mono"
                  onClick={() => preset(p.h, p.m)}
                  style={{ fontSize: 'var(--text-xs)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="faint" style={{ fontSize: 'var(--text-2xs)', marginTop: 6 }}>
              Use 5:45/6:00 PM for the 6 PM warning, 8:15 PM for the booking cutoff, 9:00+ PM for closure and safe-resolution handling.
            </p>
          </div>

          <div className="stack-sm" style={{ gap: 10 }}>
            <DemoToggle
              icon={state.demo.offline ? WifiOff : Wifi}
              label="Poor network (queue rider updates)"
              checked={state.demo.offline}
              onChange={() => {
                if (state.demo.offline) dispatch({ type: 'demo/reconnect' });
                else dispatch({ type: 'demo/toggle', key: 'offline' });
              }}
            />
            <DemoToggle icon={MapPinOff} label="Lose rider GPS (stale location)" checked={state.demo.gpsLoss} onChange={() => dispatch({ type: 'demo/toggle', key: 'gpsLoss' })} />
            <DemoToggle icon={CreditCard} label="Force next payment to fail" checked={state.demo.forcePaymentFail} onChange={() => dispatch({ type: 'demo/toggle', key: 'forcePaymentFail' })} />
            <DemoToggle icon={SignalHigh} label="Fast-forward clock (×30)" checked={state.clock.speed > 1} onChange={() => dispatch({ type: 'clock/speed', speed: state.clock.speed > 1 ? 1 : 30 })} />
          </div>

          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => dispatch({ type: 'app/reset' })}>
            Reset demo data
          </Button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle prototype demo controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          border: '1.5px dashed var(--root-500)',
          background: 'var(--surface)',
          color: 'var(--root-800)',
          borderRadius: 'var(--r-full)',
          padding: '8px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <FlaskConical size={14} />
        DEMO · {fmtTime(state.clock.epoch)}
      </button>
    </div>
  );
}

function DemoToggle({ icon: Icon, label, checked, onChange }: { icon: IconType; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="row-between" style={{ gap: 10, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
      <span className="row" style={{ gap: 8 }}>
        <Icon size={15} />
        {label}
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </label>
  );
}
