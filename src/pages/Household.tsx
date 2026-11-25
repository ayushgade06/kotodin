import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Crosshair, ExternalLink, FlaskConical, Printer, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { LIMITS, encodeCard, isISODate, nearestWells, type NearWell } from '../engine';
import { loadWells } from '../data/loadWells';
import { useProgram } from '../state/ProgramContext';
import { useToast } from '../components/Toast';
import { Button, ButtonLink, Dialog, EmptyState, Field, FillGlass, Panel, StatusBadge, cx, inputCls } from '../components/ui';
import { CapacityCurve } from '../components/charts';
import { fmtDate, fmtNum, plural, remainingLow, whyLine } from '../components/format';
import { DemoBanner, ProgramGate } from './Program';

export default function HouseholdPage() {
  return <ProgramGate><Household /></ProgramGate>;
}

function Household() {
  const { id = '' } = useParams();
  const p = useProgram();
  const toast = useToast();
  const nav = useNavigate();
  const row = p.derived!.byHousehold.get(id);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceDate, setReplaceDate] = useState(p.today);

  if (!row) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <Panel><EmptyState title="Household not found" body="It may have been removed, or the program was reset." actions={<ButtonLink to="/program" variant="primary">Back to the program</ButtonLink>} /></Panel>
      </div>
    );
  }
  const { household: h, forecast: f, filter } = row;
  const d = p.derived!;
  const media = d.media;
  const cardHash = h.influentAsUgL != null ? encodeCard({
    v: 1, code: h.code, c0: h.influentAsUgL, lpd: h.litresPerDay, m: filter.pouchMassG,
    p: { qmax: media.qmax, b: media.b, derate: media.derate, fbt: media.fBT }, k: d.calibration.k, i: row.pouch.installedOn, lang: 'bn',
  }) : null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link to="/program" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden />Program dashboard</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <FillGlass level={remainingLow(f)} status={f.status} size={52} className="text-ink" />
          <div>
            <div className="eyebrow">Household</div>
            <h1 className="display text-[clamp(30px,4vw,42px)] font-medium leading-none tnum">{h.code}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted"><StatusBadge status={f.status} /><span>{whyLine(row)}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => { setReplaceDate(p.today); setReplaceOpen(true); }} disabled={f.status === 'not_needed'}><RefreshCw className="size-4" aria-hidden />Replace pouch now</Button>
          <ButtonLink to={`/program/stickers?ids=${h.id}`}><Printer className="size-4" aria-hidden />Print sticker</ButtonLink>
          {cardHash
            ? <ButtonLink to={`/card#${cardHash}`} target="_blank"><ExternalLink className="size-4" aria-hidden />Open family card</ButtonLink>
            : <Button disabled title="Test the well first">Open family card</Button>}
        </div>
      </div>
      {p.state!.program.isDemo && <DemoBanner />}

      {f.status === 'failed' && f.failedTest && (
        <div role="alert" className="flex gap-3 rounded-xl border border-bad/30 bg-bad-50 px-4 py-3 text-sm text-bad">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div><strong>Breakthrough detected ({fmtNum(f.failedTest.asUgL)} µg/L on {fmtDate(f.failedTest.date)}). Replace the pouch.</strong> This result also improves the forecasts for every filter in the program.</div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[7fr_5fr]">
        <div className="min-w-0 space-y-5">
          <ForecastPanel />
          <TestLog onRecal={r => {
            toast({
              tone: 'info',
              title: `Calibration updated: k ${r.kFrom.toFixed(2)} → ${r.kTo.toFixed(2)}`,
              body: <>
                {r.queueDelta > 0 ? `${plural(r.queueDelta, 'filter')} moved into “Visit this week”.` : `${plural(r.changed.length, 'filter')} changed status.`}{' '}
                Learned from {plural(r.n, 'failing field test')}.{' '}
                <button type="button" className="font-semibold text-paper underline underline-offset-2" onClick={() => nav('/program')}>See the queue</button>
              </>,
            });
          }} />
        </div>
        <div className="min-w-0 space-y-5">
          <InputsPanel key={`${h.id}-${h.influentAsUgL}-${h.members}-${h.litresPerDay}-${filter.pouchMassG}`} />
          <Panel title="Pouch history" eyebrow={plural(row.pouches.length, 'pouch', 'pouches')}>
            <ol className="border-t border-line">
              {[...row.pouches].reverse().map((pc, i) => (
                <li key={pc.id} className="flex items-center justify-between border-b border-line px-5 py-2.5 text-sm last:border-b-0">
                  <span>{fmtDate(pc.installedOn)}</span>
                  <span className={cx('text-xs', i === 0 ? 'font-medium text-water' : 'text-muted')}>{i === 0 ? 'current' : 'replaced'}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <Dialog open={replaceOpen} onClose={() => setReplaceOpen(false)} title={`Replace pouch for ${h.code}`}
        footer={<><Button onClick={() => setReplaceOpen(false)}>Cancel</Button><Button variant="primary" disabled={!isISODate(replaceDate) || replaceDate > p.today || replaceDate < row.pouch.installedOn}
          onClick={() => { p.replacePouch(filter.id, replaceDate); setReplaceOpen(false); toast({ tone: 'success', title: `New pouch logged for ${h.code}`, body: 'Forecast reset. Reprint the sticker so the family card shows the new countdown.' }); }}>Log new pouch</Button></>}>
        <Field label="Installed on" htmlFor="rp-date" hint="Defaults to today. Must not be before the current pouch or in the future.">
          <input id="rp-date" type="date" value={replaceDate} min={row.pouch.installedOn} max={p.today} onChange={e => setReplaceDate(e.target.value)} className={inputCls()} />
        </Field>
      </Dialog>
    </div>
  );
}

function useRow() {
  const { id = '' } = useParams();
  const p = useProgram();
  return { p, row: p.derived!.byHousehold.get(id)! };
}

function ForecastPanel() {
  const { p, row } = useRow();
  const f = row.forecast, h = row.household, media = p.derived!.media;
  if (!f.days || !f.daysLeft || !f.replaceBy || !f.qe || !f.capacityMg || f.dailyLoadMg == null) {
    return (
      <Panel title="Forecast">
        <EmptyState icon={<FlaskConical className="size-5" />}
          title={f.status === 'not_needed' ? 'No arsenic filter needed' : 'Test the well to get a forecast'}
          body={f.status === 'not_needed' ? `This well is at ${fmtNum(h.influentAsUgL ?? 0)} µg/L, at or below the 10 µg/L WHO guideline.` : 'Log an influent test (or use the nearest survey wells) in the inputs panel.'} />
      </Panel>
    );
  }
  const left = f.daysLeft.low;
  const c = (h.influentAsUgL ?? 0) / 1000;
  const k = p.derived!.calibration.k;
  return (
    <Panel title="Forecast" eyebrow="Conservative by design">
      <div className="border-t border-line px-5 py-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-sm text-muted">Replace by</div>
            <div className="display text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tnum">{fmtDate(f.replaceBy)}</div>
            <div className={cx('mt-0.5 text-sm font-medium tnum', left <= 0 ? 'text-bad' : left <= 7 ? 'text-due-ink' : 'text-ok')}>
              {left > 0 ? `in ${plural(left, 'day')}` : left === 0 ? 'today' : `${plural(-left, 'day')} ago`}
            </div>
          </div>
          <div className="pb-1">
            <div className="text-sm text-muted">Pouch life, low – mid – high</div>
            <div className="mt-1 text-lg font-semibold tnum">{fmtNum(f.days.low)} – {fmtNum(f.days.mid)} – {fmtNum(f.days.high)} days</div>
            <div className="text-xs text-muted">installed {fmtDate(row.pouch.installedOn)} · day {f.daysElapsed}</div>
          </div>
        </div>
        <div className="mt-5"><CapacityCurve f={f} tests={row.tests} installedOn={row.pouch.installedOn} /></div>
        <details className="group mt-5 rounded-lg border border-line bg-paper/60">
          <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium"><Calculator className="size-4 text-water" aria-hidden />How is this calculated?<span className="ml-auto text-xs text-muted group-open:hidden">show the numbers</span></summary>
          <div className="space-y-2 border-t border-line px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2 tnum">
            <p>C = {fmtNum(h.influentAsUgL!)} µg/L = {c.toFixed(3)} mg/L · water {fmtNum(h.litresPerDay)} L/day · pouch {fmtNum(row.filter.pouchMassG)} g · k = {k.toFixed(2)}</p>
            {(['low', 'mid', 'high'] as const).map((b, i) => (
              <p key={b}>
                <span className="font-sans font-semibold text-ink">{b}:</span> qe = {media.qmax[i]}·{media.b}·{c.toFixed(3)} / (1 + {media.b}·{c.toFixed(3)}) = {f.qe![b].toFixed(3)} mg/g;{' '}
                Q = {fmtNum(row.filter.pouchMassG)}·{f.qe![b].toFixed(3)}·{media.derate[i]}·{media.fBT}·{k.toFixed(2)} = {f.capacityMg![b].toFixed(1)} mg;{' '}
                D = {f.capacityMg![b].toFixed(1)} / {f.dailyLoadMg!.toFixed(3)} = <strong className="text-ink">{f.days![b].toFixed(1)} days</strong>
              </p>
            ))}
            <p>daily load L = {c.toFixed(3)} mg/L × {fmtNum(h.litresPerDay)} L = {f.dailyLoadMg.toFixed(3)} mg/day · replace by = install + floor(D_low) = {fmtDate(f.replaceBy)}</p>
            <p className="font-sans text-xs text-muted">qmax, b, derating and fBT are literature-based assumptions until measured. <Link to="/methods" className="text-water underline">Methods &amp; limits</Link></p>
          </div>
        </details>
      </div>
    </Panel>
  );
}

function InputsPanel() {
  const { p, row } = useRow();
  const toast = useToast();
  const h = row.household;
  const [members, setMembers] = useState(String(h.members));
  const [lpd, setLpd] = useState(String(h.litresPerDay));
  const [mass, setMass] = useState(String(row.filter.pouchMassG));
  const [near, setNear] = useState<{ wells: NearWell[]; medianAs: number | null } | null>(null);
  const [nearErr, setNearErr] = useState(false);
  const n = Number;
  const inR = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  const errs = {
    members: Number.isInteger(n(members)) && inR(n(members), [1, 30]) ? null : 'Whole number, 1–30.',
    lpd: inR(n(lpd), LIMITS.litresPerDay) ? null : '1–200 litres.',
    mass: inR(n(mass), LIMITS.massG) ? null : '10–5000 g.',
  };
  const dirty = n(members) !== h.members || n(lpd) !== h.litresPerDay || n(mass) !== row.filter.pouchMassG;
  const bad = Object.values(errs).some(Boolean);

  useEffect(() => {
    let live = true;
    loadWells().then(ws => { if (live) setNear(nearestWells(ws, h.lat, h.lon, 5, 5)); }).catch(() => live && setNearErr(true));
    return () => { live = false; };
  }, [h.lat, h.lon]);

  return (
    <Panel title="Inputs" eyebrow="Edit to update the forecast">
      <div className="space-y-4 border-t border-line px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          <Field label="People" htmlFor="in-m" error={errs.members}><input id="in-m" type="number" value={members} onChange={e => setMembers(e.target.value)} className={inputCls(!!errs.members)} /></Field>
          <Field label="Litres/day" htmlFor="in-l" error={errs.lpd}><input id="in-l" type="number" value={lpd} onChange={e => setLpd(e.target.value)} className={inputCls(!!errs.lpd)} /></Field>
          <Field label="Pouch (g)" htmlFor="in-g" error={errs.mass}><input id="in-g" type="number" value={mass} onChange={e => setMass(e.target.value)} className={inputCls(!!errs.mass)} /></Field>
        </div>
        <p className="text-xs text-muted">Default water use is 5 L per person per day for drinking and cooking (an assumption).</p>
        {dirty && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={bad} onClick={() => { p.updateHousehold(h.id, { members: n(members), litresPerDay: n(lpd) }, n(mass)); toast({ tone: 'success', title: 'Inputs saved', body: 'Forecast updated.' }); }}>Save changes</Button>
            <Button size="sm" variant="ghost" onClick={() => { setMembers(String(h.members)); setLpd(String(h.litresPerDay)); setMass(String(row.filter.pouchMassG)); }}>Discard</Button>
          </div>
        )}
        <div className="rounded-lg border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-medium text-ink-2">Well arsenic</div>
            <span className={cx('rounded px-1.5 py-0.5 text-[11px] font-medium', h.influentSource === 'field_test' ? 'bg-water-50 text-water-ink' : h.influentSource === 'bgs_nearest' ? 'bg-due-50 text-due-ink' : 'bg-grey-50 text-grey')}>
              {h.influentSource === 'field_test' ? 'field test' : h.influentSource === 'bgs_nearest' ? 'survey estimate' : 'not tested'}
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold tnum">{h.influentAsUgL != null ? `${fmtNum(h.influentAsUgL)} µg/L` : '—'}</div>
          <p className="mt-1 text-xs text-muted">Log an influent test below to update it.</p>
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">Nearest survey wells (≤ 5 km, 1998–99)</span>
              {near?.medianAs != null && h.influentSource !== 'field_test' && Math.round(near.medianAs) !== h.influentAsUgL && (
                <Button size="sm" variant="ghost" onClick={() => p.updateHousehold(h.id, { influentAsUgL: Math.round(near.medianAs!), influentSource: 'bgs_nearest' })}><Crosshair className="size-3.5" aria-hidden />Use median</Button>
              )}
            </div>
            {nearErr ? <p className="mt-1 text-xs text-bad">Survey data unavailable offline on first visit.</p>
              : !near ? <p className="mt-1 text-xs text-muted">Loading…</p>
              : near.wells.length === 0 ? <p className="mt-1 text-xs text-muted">No survey wells within 5 km.</p>
              : (
                <>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2 tnum">
                    {near.wells.map(w => <li key={w.id} className="flex justify-between gap-2"><span>{w.id} · {fmtNum(w.distanceKm, 1)} km · {w.depthM ?? '?'} m</span><span className="font-medium">{w.asUgL < 1 ? "< 1" : fmtNum(w.asUgL)} µg/L</span></li>)}
                  </ul>
                  <p className="mt-1.5 text-xs text-muted">Median {fmtNum(near.medianAs ?? 0)} µg/L. <span className="text-due-ink">Arsenic varies sharply between neighbouring wells: test this well.</span></p>
                </>
              )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TestLog({ onRecal }: { onRecal: (r: NonNullable<ReturnType<ReturnType<typeof useProgram>['addTest']>>) => void }) {
  const { p, row } = useRow();
  const toast = useToast();
  const [date, setDate] = useState(p.today);
  const [kind, setKind] = useState<'effluent' | 'influent'>('effluent');
  const [val, setVal] = useState('');
  const [kit, setKit] = useState('');
  const [tried, setTried] = useState(false);
  const v = val.trim() === '' ? NaN : Number(val);
  const errs = {
    val: Number.isFinite(v) && v >= 0 && v <= 3000 ? null : 'Enter 0–3000 µg/L.',
    date: isISODate(date) && date <= p.today ? null : 'Date can’t be in the future.',
  };
  const willFail = kind === 'effluent' && Number.isFinite(v) && v >= 10;
  const tests = useMemo(() => row.tests, [row.tests]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errs.val || errs.date) return;
    const r = p.addTest({ filterId: row.filter.id, date, kind, asUgL: v, kit: kit.trim() || undefined });
    setVal(''); setTried(false);
    if (r) onRecal(r);
    else toast({ tone: willFail ? 'warn' : 'success', title: willFail ? 'Breakthrough logged' : 'Test logged', body: willFail ? 'This filter is now marked as failed. Replace the pouch.' : kind === 'influent' ? 'Well arsenic updated from this test.' : 'Below 10 µg/L: the filter is still working.' });
  };

  return (
    <Panel title="Field tests" eyebrow="Influent = well water · Effluent = filtered water">
      <form onSubmit={submit} className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto] sm:items-end" noValidate>
        <Field label="Date" htmlFor="t-date" error={tried ? errs.date : null}><input id="t-date" type="date" max={p.today} value={date} onChange={e => setDate(e.target.value)} className={inputCls(tried && !!errs.date)} /></Field>
        <Field label="Sample" htmlFor="t-kind">
          <select id="t-kind" value={kind} onChange={e => setKind(e.target.value as 'effluent' | 'influent')} className={inputCls()}>
            <option value="effluent">Effluent (filtered)</option>
            <option value="influent">Influent (well)</option>
          </select>
        </Field>
        <Field label="Arsenic (µg/L)" htmlFor="t-val" error={tried ? errs.val : null}><input id="t-val" type="number" inputMode="decimal" min={0} max={3000} value={val} onChange={e => setVal(e.target.value)} className={inputCls(tried && !!errs.val)} placeholder="e.g. 14" /></Field>
        <Field label="Kit (optional)" htmlFor="t-kit"><input id="t-kit" value={kit} onChange={e => setKit(e.target.value)} maxLength={40} className={inputCls()} placeholder="e.g. Hach EZ" /></Field>
        <Button type="submit" variant={willFail ? 'danger' : 'water'} className="sm:mb-0">{willFail ? 'Log breakthrough' : 'Log test'}</Button>
      </form>
      {willFail && <p className="-mt-1 px-5 pb-3 text-xs text-bad">≥ 10 µg/L in filtered water means the pouch has broken through.</p>}
      <div className="relative overflow-x-auto border-t border-line">
        <table className="w-full min-w-[480px] text-sm tnum">
          <thead className="bg-paper/60 text-left text-[12.5px] text-muted"><tr><th className="py-2 pl-5 font-medium">Date</th><th className="font-medium">Sample</th><th className="font-medium">Arsenic</th><th className="font-medium">Kit</th><th className="pr-5" aria-label="Actions" /></tr></thead>
          <tbody>
            {tests.map(t => {
              const fail = t.kind === 'effluent' && t.asUgL >= 10;
              return (
                <tr key={t.id} className="border-t border-line">
                  <td className="py-2 pl-5">{fmtDate(t.date)}</td>
                  <td>{t.kind === 'effluent' ? 'Effluent' : 'Influent'}</td>
                  <td className={cx('font-medium', fail ? 'text-bad' : t.kind === 'effluent' ? 'text-ok' : '')}>{fmtNum(t.asUgL, t.asUgL % 1 ? 1 : 0)} µg/L {t.kind === 'effluent' && (fail ? '✕' : '✓')}</td>
                  <td className="text-muted">{t.kit ?? '—'}</td>
                  <td className="pr-5 text-right"><button type="button" onClick={() => p.removeTest(t.id)} className="rounded p-1 text-muted hover:bg-bad-50 hover:text-bad" aria-label={`Delete test from ${t.date}`}><Trash2 className="size-4" /></button></td>
                </tr>
              );
            })}
            {tests.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">No tests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
