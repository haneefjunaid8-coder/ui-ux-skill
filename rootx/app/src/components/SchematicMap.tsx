import React from 'react';
import type { Zone } from '../engine/types';

/* ============================================================================
   SchematicMap — the ROOT-X demo map.
   ----------------------------------------------------------------------------
   A self-contained SVG map of the demo service area (Osogbo campus + Oke-Baale
   township). No network tiles — by design: low-data first, works offline.
   Production swaps this for OpenStreetMap-based tiles (Leaflet) + OSRM routing
   behind the same component interface — see docs/11-mapping.md.

   1 unit = 10 m. Signature route-thread dashes carry routes and boundaries.
   ========================================================================== */

export interface MapPin {
  x: number;
  y: number;
  kind: 'pickup' | 'dropoff' | 'rider' | 'generic';
  label?: string;
  index?: number;
  stale?: boolean;
  active?: boolean;
}

interface Props {
  zones: Zone[];
  pins?: MapPin[];
  route?: { x: number; y: number }[];
  height?: number;
  onMapClick?: (pt: { x: number; y: number }) => void;
  onLandmarkClick?: (landmarkId: string) => void;
  highlightLandmarkId?: string;
  showAllLandmarkLabels?: boolean;
  caption?: string;
}

const VB_W = 560;
const VB_H = 540;

export function SchematicMap({
  zones,
  pins = [],
  route,
  height = 300,
  onMapClick,
  onLandmarkClick,
  highlightLandmarkId,
  showAllLandmarkLabels = true,
  caption,
}: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  function toMap(e: React.MouseEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * VB_W;
    const vy = ((e.clientY - r.top) / r.height) * VB_H;
    return { x: Math.round(vx * 10) / 10, y: Math.round(vy * 10) / 10 };
  }

  const pathFrom = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const polyFrom = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          background: 'oklch(0.965 0.01 90)',
          boxShadow: 'inset 0 0 0 9999px oklch(0.965 0.008 90)',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={caption ?? 'Schematic map of the ROOT-X demo service area'}
          style={{ display: 'block', width: '100%', height, cursor: onMapClick ? 'crosshair' : 'default' }}
          onClick={(e) => {
            if (!onMapClick) return;
            const pt = toMap(e);
            if (pt) onMapClick(pt);
          }}
        >
          <defs>
            <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.8" fill="oklch(0.75 0.02 85)" />
            </pattern>
            <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="oklch(0.55 0.12 25 / 0.5)" strokeWidth="1.6" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#grid-dots)" />

          {/* roads — campus ring + township artery */}
          <path d="M60 320 C 140 300, 200 330, 250 330 S 380 340, 470 400" stroke="oklch(0.8 0.015 80)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M150 300 C 150 220, 200 140, 300 120 S 420 140, 430 240" stroke="oklch(0.82 0.015 80)" strokeWidth="8" fill="none" />
          <path d="M150 300 L 150 420 M 250 330 L 250 420 M 350 340 L 350 400" stroke="oklch(0.8 0.015 80)" strokeWidth="6" fill="none" />
          <text x="70" y="308" fontSize="8.5" fill="oklch(0.55 0.02 80)" fontFamily="var(--font-ui)" fontWeight="600">CAMPUS ROAD</text>

          {zones.map((z) => {
            const inactive = !z.active;
            return (
              <g key={z.id}>
                <polygon
                  points={polyFrom(z.polygon)}
                  fill={inactive ? 'oklch(0.9 0.005 80)' : z.kind === 'campus' ? 'oklch(0.955 0.03 150 / 0.5)' : 'oklch(0.955 0.035 75 / 0.45)'}
                  stroke={inactive ? 'oklch(0.75 0.01 80)' : z.kind === 'campus' ? 'var(--root-400)' : 'var(--dusk-400)'}
                  strokeWidth="2"
                  strokeDasharray={inactive ? '4 5' : undefined}
                />
                <text
                  x={z.polygon[0].x + 8}
                  y={z.polygon[0].y - 8}
                  fontSize="10.5"
                  fontWeight="700"
                  fill={inactive ? 'oklch(0.6 0.01 80)' : z.kind === 'campus' ? 'var(--root-800)' : 'var(--dusk-800)'}
                  fontFamily="var(--font-display)"
                >
                  {z.name}
                  {inactive ? ' — suspended' : ''}
                </text>
                {z.restricted.map((r, i) => (
                  <g key={i}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#hatch)" stroke="oklch(0.55 0.12 25 / 0.7)" strokeWidth="1.4" rx="4" />
                    <text x={r.x + 6} y={r.y + 16} fontSize="7.5" fill="oklch(0.45 0.1 25)" fontWeight="600">{r.label}</text>
                  </g>
                ))}
                {z.landmarks.map((l) => {
                  const hl = highlightLandmarkId === l.id;
                  return (
                    <g
                      key={l.id}
                      style={{ cursor: onLandmarkClick ? 'pointer' : 'default' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLandmarkClick?.(l.id);
                      }}
                    >
                      <rect
                        x={l.x - 5}
                        y={l.y - 5}
                        width="10"
                        height="10"
                        rx="2.5"
                        fill={hl ? 'var(--root-600)' : 'var(--surface)'}
                        stroke={hl ? 'var(--root-700)' : 'oklch(0.55 0.02 80)'}
                        strokeWidth="1.8"
                      />
                      {showAllLandmarkLabels && (
                        <text x={l.x + 9} y={l.y + 3.5} fontSize="8" fill="oklch(0.42 0.02 80)" fontFamily="var(--font-ui)">
                          {l.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* signature route thread */}
          {route && route.length > 1 && (
            <>
              <path d={pathFrom(route)} stroke="var(--root-600)" strokeWidth="7" fill="none" strokeOpacity="0.12" strokeLinecap="round" />
              <path d={pathFrom(route)} stroke="var(--root-600)" strokeWidth="2.6" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            </>
          )}

          {/* pins */}
          {pins.map((p, i) => {
            if (p.kind === 'rider') {
              return (
                <g key={'rider' + i}>
                  {p.active && !p.stale && (
                    <circle cx={p.x} cy={p.y} r="14" fill="var(--adire-500)" opacity="0.18">
                      <animate attributeName="r" values="9;16;9" dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.28;0.05;0.28" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={p.x} cy={p.y} r="8.5" fill={p.stale ? 'oklch(0.7 0.01 80)' : 'var(--adire-600)'} stroke="white" strokeWidth="2.4" />
                  {p.stale && (
                    <text x={p.x + 13} y={p.y + 3} fontSize="8.5" fontWeight="700" fill="oklch(0.45 0.02 80)" fontFamily="var(--font-mono)">
                      GPS STALE
                    </text>
                  )}
                  {!p.stale && p.label && (
                    <text x={p.x + 13} y={p.y + 3} fontSize="8.5" fontWeight="700" fill="var(--adire-800)" fontFamily="var(--font-ui)">
                      {p.label}
                    </text>
                  )}
                </g>
              );
            }
            const isPickup = p.kind === 'pickup';
            const color = isPickup ? 'var(--root-700)' : 'var(--adire-600)';
            return (
              <g key={'pin' + i}>
                <circle cx={p.x} cy={p.y} r="10" fill="white" stroke={color} strokeWidth="2.6" />
                <text x={p.x} y={p.y + 3.6} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={color} fontFamily="var(--font-mono)">
                  {p.index ?? (isPickup ? 1 : 2)}
                </text>
                {p.label && (
                  <text x={p.x} y={p.y - 15} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={color} fontFamily="var(--font-ui)">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {caption && (
        <figcaption className="faint" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
