import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zone } from '../engine/types';
import { toLatLng, fromLatLng } from '../engine/zones';

/* ============================================================================
   LiveMap — the real-world map (OpenStreetMap data, CARTO dark tiles).
   ----------------------------------------------------------------------------
   Renders the configured service zones as geofenced polygons over real
   Osogbo geography (anchored on UNIOSUN main campus), with landmarks, stops,
   the route polyline and the live rider marker. The engine keeps reasoning in
   schematic units; toLatLng/fromLatLng are the projection seam (docs/12).
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

const ZONE_STYLE: Record<string, { color: string; fill: string }> = {
  campus: { color: '#ae67fa', fill: 'rgba(174, 103, 250, 0.10)' },
  township: { color: '#f49867', fill: 'rgba(244, 152, 103, 0.08)' },
};

function pinIcon(p: MapPin): L.DivIcon {
  const cls = `lx-pin lx-pin--${p.kind}${p.stale ? ' lx-pin--stale' : ''}${p.active ? ' lx-pin--active' : ''}`;
  const inner =
    p.kind === 'rider'
      ? '<span class="lx-pin__pulse"></span><span class="lx-pin__dot"></span>'
      : p.index != null
        ? `<span class="lx-pin__idx">${p.index}</span>`
        : '';
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" title="${p.label ?? ''}">${inner}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function LiveMap({
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
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const didFit = useRef(false);
  const clickRef = useRef(onMapClick);
  const lmClickRef = useRef(onLandmarkClick);
  clickRef.current = onMapClick;
  lmClickRef.current = onLandmarkClick;

  // init once
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView([7.7616, 4.6012], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      clickRef.current?.(fromLatLng(e.latlng.lat, e.latlng.lng));
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      didFit.current = false;
    };
  }, []);

  // redraw layers whenever inputs change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    // zones (geofence polygons)
    for (const z of zones) {
      const latlngs = z.polygon.map((p) => {
        const ll = toLatLng(p.x, p.y);
        return [ll.lat, ll.lng] as [number, number];
      });
      const style = ZONE_STYLE[z.kind] ?? ZONE_STYLE.campus;
      const poly = L.polygon(latlngs, {
        color: style.color,
        weight: z.active ? 2 : 1,
        opacity: z.active ? 0.85 : 0.35,
        fillColor: style.color,
        fillOpacity: z.active ? 0.1 : 0.03,
        dashArray: z.active ? undefined : '4 6',
        interactive: false,
      }).addTo(layer);
      poly.bindTooltip(`${z.name}${z.active ? '' : ' (inactive)'}`, { sticky: true, className: 'lx-tip' });
      bounds.extend(poly.getBounds());
    }

    // landmarks
    for (const z of zones) {
      for (const lm of z.landmarks) {
        const ll = toLatLng(lm.x, lm.y);
        const highlighted = highlightLandmarkId === lm.id;
        const marker = L.marker([ll.lat, ll.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="lx-lm${highlighted ? ' lx-lm--hi' : ''}" title="${lm.name}"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
          keyboard: false,
        }).addTo(layer);
        if (showAllLandmarkLabels || highlighted) {
          marker.bindTooltip(lm.name, { direction: 'top', className: 'lx-tip', offset: [0, -6] });
        }
        marker.on('click', () => lmClickRef.current?.(lm.id));
        bounds.extend(marker.getLatLng());
      }
    }

    // route polyline (the route thread)
    if (route && route.length > 1) {
      const latlngs = route.map((p) => {
        const ll = toLatLng(p.x, p.y);
        return [ll.lat, ll.lng] as [number, number];
      });
      L.polyline(latlngs, { color: '#ae67fa', weight: 3.5, opacity: 0.9, dashArray: '2 8', lineCap: 'round' }).addTo(layer);
      bounds.extend(L.latLngBounds(latlngs));
    }

    // pins
    for (const p of pins) {
      const ll = toLatLng(p.x, p.y);
      const marker = L.marker([ll.lat, ll.lng], { icon: pinIcon(p), zIndexOffset: p.kind === 'rider' ? 500 : 100 }).addTo(layer);
      if (p.label) marker.bindTooltip(p.label, { direction: 'top', className: 'lx-tip', offset: [0, -10] });
      bounds.extend(marker.getLatLng());
    }

    if (!didFit.current && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { animate: false, maxZoom: 16 });
      didFit.current = true;
    }
  }, [zones, pins, route, highlightLandmarkId, showAllLandmarkLabels]);

  return (
    <figure style={{ margin: 0 }}>
      <div
        className="lx-map"
        style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', overflow: 'hidden', height, background: 'var(--surface-sunken)' }}
        ref={hostRef}
        role="application"
        aria-label="Interactive campus map"
      />
      {caption && <figcaption className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6, textAlign: 'center' }}>{caption}</figcaption>}
    </figure>
  );
}

