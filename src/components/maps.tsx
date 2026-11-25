import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Status, Well } from '../engine';
import { binIndex } from '../engine';
import { BUCKET_COLORS } from './charts';
import { STATUS_STYLE } from './ui';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function baseMap(el: HTMLElement, opts: L.MapOptions = {}) {
  const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, ...opts });
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
  return map;
}

// Status → marker shape, so status is never conveyed by colour alone.
const SHAPES: Record<Status, string> = {
  ok: '<circle cx="9" cy="9" r="6"/>',
  due: '<path d="M9 2.5 15.5 9 9 15.5 2.5 9z"/>',
  overdue: '<rect x="3" y="3" width="12" height="12" rx="1.5"/>',
  failed: '<path d="M9 2 16.5 15h-15z"/>',
  not_needed: '<circle cx="9" cy="9" r="4.5"/>',
  unknown_influent: '<circle cx="9" cy="9" r="4.5"/>',
};

function statusIcon(s: Status, highlighted: boolean) {
  const c = STATUS_STYLE[s].dot;
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<svg width="18" height="18" viewBox="0 0 18 18" style="overflow:visible;filter:drop-shadow(0 1px 1px rgb(0 0 0/.25))">${highlighted ? `<circle cx="9" cy="9" r="12" fill="${c}" opacity=".25"><animate attributeName="r" values="9;14;9" dur="1.6s" repeatCount="2"/></circle>` : ''}<g fill="${c}" stroke="#fff" stroke-width="1.6">${SHAPES[s]}</g></svg>`,
  });
}

export interface ProgramPoint { id: string; code: string; lat: number; lon: number; status: Status; label: string }

export function ProgramMap({ points, highlight, onOpen, onPick, pick, className }: {
  points: ProgramPoint[]; highlight?: Set<string>; onOpen?: (id: string) => void;
  onPick?: (lat: number, lon: number) => void; pick?: { lat: number; lon: number } | null; className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.Marker | null>(null);
  const cb = useRef({ onOpen, onPick });
  cb.current = { onOpen, onPick };

  useEffect(() => {
    const m = baseMap(el.current!);
    m.setView([23.66, 90.61], 11);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', e => cb.current.onPick?.(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const p of points) {
      L.marker([p.lat, p.lon], { icon: statusIcon(p.status, !!highlight?.has(p.id)), keyboard: true, title: `${p.code}: ${p.label}`, alt: `${p.code}: ${p.label}` })
        .bindTooltip(`<strong>${p.code}</strong> · ${p.label}`, { direction: 'top', offset: [0, -8] })
        .on('click', () => cb.current.onOpen?.(p.id))
        .addTo(g);
    }
    if (points.length && !pick) m.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lon])), { padding: [24, 24], maxZoom: 13 });
  }, [points, highlight, pick]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pickMarker.current?.remove();
    if (pick) pickMarker.current = L.marker([pick.lat, pick.lon], { icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 22], html: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="#0F1B24" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.5" fill="#fff"/></svg>' }) }).addTo(m);
  }, [pick]);

  useEffect(() => { const t = setTimeout(() => map.current?.invalidateSize(), 50); return () => clearTimeout(t); });

  return <div ref={el} className={className} role="application" aria-label="Map of filters, coloured and shaped by status. The table below lists the same households." />;
}

/** All survey wells, coloured by days-to-breakthrough bucket (canvas renderer for ~3.5k points). */
export function WellsMap({ wells, days, className }: { wells: Well[]; days: Float64Array; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    const m = baseMap(el.current!, { preferCanvas: true });
    m.setView([23.7, 90.35], 7);
    const renderer = L.canvas({ padding: 0.3 });
    markers.current = wells.map(w => L.circleMarker([w.lat, w.lon], { renderer, radius: 3.2, weight: 0, fillOpacity: 0.85, fillColor: '#999' })
      .bindTooltip(() => `${w.upazila}, ${w.district}<br>${w.asUgL} µg/L`, { direction: 'top' })
      .addTo(m));
    return () => { m.remove(); markers.current = []; };
  }, [wells]);

  useEffect(() => {
    markers.current.forEach((mk, i) => {
      const d = days[i];
      mk.setStyle(Number.isNaN(d) ? { fillColor: '#B9B3A6', fillOpacity: 0.45, radius: 2.4 } : { fillColor: BUCKET_COLORS[binIndex(d)], fillOpacity: 0.9, radius: 3.2 });
    });
  }, [days]);

  return <div ref={el} className={className} role="img" aria-label="Map of survey wells coloured by how long a pouch would last at each well. The histogram and table show the same distribution." />;
}
