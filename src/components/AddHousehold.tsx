import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { LIMITS, isISODate, nearestWells, type NearWell } from '../engine';
import { loadWells } from '../data/loadWells';
import type { NewHousehold } from '../state/ProgramContext';
import { Button, Dialog, Field, inputCls, cx } from './ui';
import { ProgramMap, type ProgramPoint } from './maps';
import { fmtNum } from './format';

type Source = 'field_test' | 'bgs_nearest' | 'unknown';

export function AddHouseholdDialog({ open, onClose, onAdd, points, today, defaultMassG }: {
  open: boolean; onClose: () => void; onAdd: (h: NewHousehold) => void; points: ProgramPoint[]; today: string; defaultMassG: number;
}) {
  const [lat, setLat] = useState(''), [lon, setLon] = useState('');
  const [members, setMembers] = useState('5'), [lpd, setLpd] = useState(''), [mass, setMass] = useState(String(defaultMassG));
  const [source, setSource] = useState<Source>('field_test');
  const [c0, setC0] = useState(''), [installed, setInstalled] = useState(today);
  const [near, setNear] = useState<{ wells: NearWell[]; medianAs: number | null } | null>(null);
  const [nearState, setNearState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tried, setTried] = useState(false);

  const n = (s: string) => (s.trim() === '' ? NaN : Number(s));
  const lpdValue = lpd.trim() === '' ? n(members) * 5 : n(lpd);
  const inR = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  const errors = {
    lat: inR(n(lat), [20, 27]) ? null : 'Pick a point on the map or enter a latitude in Bangladesh (20–27).',
    lon: inR(n(lon), [88, 93]) ? null : 'Longitude must be 88–93.',
    members: Number.isInteger(n(members)) && inR(n(members), [1, 30]) ? null : 'Whole number, 1–30.',
    lpd: inR(lpdValue, LIMITS.litresPerDay) ? null : 'Litres per day must be 1–200.',
    mass: inR(n(mass), LIMITS.massG) ? null : 'Pouch mass must be 10–5000 g.',
    c0: source === 'field_test' ? (inR(n(c0), LIMITS.c0) ? null : 'Arsenic must be 0–3000 µg/L.') : source === 'bgs_nearest' && near?.medianAs == null ? 'Find the nearest survey wells first.' : null,
    installed: isISODate(installed) && installed <= today ? null : 'Use a date that is not in the future.',
  };
  const invalid = Object.values(errors).some(Boolean);

  const findNear = async () => {
    if (errors.lat || errors.lon) { setTried(true); return; }
    setNearState('loading');
    try {
      const r = nearestWells(await loadWells(), n(lat), n(lon), 5, 5);
      setNear(r); setNearState('idle');
    } catch { setNearState('error'); }
  };

  const submit = () => {
    setTried(true);
    if (invalid) return;
    onAdd({
      lat: n(lat), lon: n(lon), members: n(members), litresPerDay: lpdValue, pouchMassG: n(mass), installedOn: installed,
      influentSource: source,
      influentAsUgL: source === 'field_test' ? n(c0) : source === 'bgs_nearest' ? Math.round(near!.medianAs!) : null,
    });
    setLat(''); setLon(''); setC0(''); setNear(null); setTried(false);
  };
  const err = (k: keyof typeof errors) => (tried ? errors[k] : null);

  return (
    <Dialog open={open} onClose={onClose} title="Add a household" wide footer={<>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={submit}>Add household</Button>
    </>}>
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">Location: click the map</p>
          <ProgramMap points={points} pick={Number.isFinite(n(lat)) && Number.isFinite(n(lon)) ? { lat: n(lat), lon: n(lon) } : null}
            onPick={(a, b) => { setLat(String(a)); setLon(String(b)); setNear(null); }} className="h-64 rounded-lg border border-line md:h-full md:min-h-72" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Latitude" htmlFor="ah-lat" error={err('lat')}><input id="ah-lat" inputMode="decimal" value={lat} onChange={e => { setLat(e.target.value); setNear(null); }} className={inputCls(!!err('lat'))} placeholder="23.6612" /></Field>
            <Field label="Longitude" htmlFor="ah-lon" error={err('lon')}><input id="ah-lon" inputMode="decimal" value={lon} onChange={e => { setLon(e.target.value); setNear(null); }} className={inputCls(!!err('lon'))} placeholder="90.6084" /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">Use an approximate point (a few hundred metres off is fine). Kotodin stores no names or addresses.</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="People" htmlFor="ah-m" error={err('members')}><input id="ah-m" type="number" min={1} max={30} value={members} onChange={e => setMembers(e.target.value)} className={inputCls(!!err('members'))} /></Field>
            <Field label="Litres per day" htmlFor="ah-l" error={err('lpd')} hint={lpd === '' ? `Default ${fmtNum(lpdValue || 0)} L (5 L per person)` : undefined}>
              <input id="ah-l" type="number" min={1} max={200} value={lpd} placeholder={String(lpdValue || '')} onChange={e => setLpd(e.target.value)} className={inputCls(!!err('lpd'))} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-ink-2">Well arsenic (influent)</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-paper-2 p-1 text-[13px]" role="radiogroup">
              {([['field_test', 'Field test'], ['bgs_nearest', 'Survey estimate'], ['unknown', 'Not tested']] as const).map(([v, label]) => (
                <label key={v} className={cx('cursor-pointer rounded-md px-2 py-1.5 text-center font-medium transition-colors', source === v ? 'bg-surface shadow-soft text-ink' : 'text-muted hover:text-ink')}>
                  <input type="radio" name="ah-src" value={v} checked={source === v} onChange={() => setSource(v)} className="sr-only" />{label}
                </label>
              ))}
            </div>
            <div className="mt-3">
              {source === 'field_test' && (
                <Field label="Arsenic in well water (µg/L)" htmlFor="ah-c0" error={err('c0')}><input id="ah-c0" type="number" min={0} max={3000} value={c0} onChange={e => setC0(e.target.value)} className={inputCls(!!err('c0'))} placeholder="e.g. 180" /></Field>
              )}
              {source === 'bgs_nearest' && (
                <div className="rounded-lg border border-line p-3 text-sm">
                  <Button size="sm" onClick={findNear} loading={nearState === 'loading'}><Crosshair className="size-4" aria-hidden />Use nearest survey wells</Button>
                  {nearState === 'error' && <p className="mt-2 text-xs text-bad">Couldn’t load the survey data. Check the connection and try again.</p>}
                  {err('c0') && !near && <p className="mt-2 text-xs text-bad">{err('c0')}</p>}
                  {near && (near.medianAs == null
                    ? <p className="mt-2 text-xs text-bad">No survey wells within 5 km. Test this well instead.</p>
                    : <div className="mt-2">
                        <p className="font-medium">Estimate: {fmtNum(near.medianAs)} µg/L <span className="font-normal text-muted">(median of {near.wells.length})</span></p>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted tnum">{near.wells.map(w => <li key={w.id}>{w.id} · {fmtNum(w.distanceKm, 1)} km · {w.asUgL < 1 ? "< 1" : fmtNum(w.asUgL)} µg/L · {w.depthM ?? '?'} m deep</li>)}</ul>
                        <p className="mt-2 text-xs text-due-ink">Arsenic varies sharply between neighbouring wells: test this well.</p>
                      </div>)}
                </div>
              )}
              {source === 'unknown' && <p className="text-xs text-muted">The household will show “Test the well” until an influent test is logged.</p>}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Pouch mass (g)" htmlFor="ah-mass" error={err('mass')}><input id="ah-mass" type="number" min={10} max={5000} value={mass} onChange={e => setMass(e.target.value)} className={inputCls(!!err('mass'))} /></Field>
            <Field label="Pouch installed on" htmlFor="ah-inst" error={err('installed')}><input id="ah-inst" type="date" max={today} value={installed} onChange={e => setInstalled(e.target.value)} className={inputCls(!!err('installed'))} /></Field>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
