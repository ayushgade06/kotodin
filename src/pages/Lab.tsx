import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy, Crosshair, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { FE_RHA_LITERATURE, designLabSweep, findMassForTarget, type MediaParams, type Well } from '../engine';
import { loadWells } from '../data/loadWells';
import { Button, Field, InfoTip, Panel, Skeleton, Stat, cx, inputCls } from '../components/ui';
import { Histogram, BUCKET_COLORS } from '../components/charts';
import { WellsMap } from '../components/maps';
import { MediaEditor, draftToMedia, toDraft, type Draft } from '../components/MediaEditor';
import { fmtBDT, fmtNum } from '../components/format';
import { BIN_LABELS } from '../engine';

function useWells() {
  const [wells, setWells] = useState<Well[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    loadWells().then(w => live && setWells(w)).catch(() => live && setError(true));
    return () => { live = false; };
  }, [attempt]);
  return { wells, error, retry: () => setAttempt(a => a + 1) };
}

const clampNum = (s: string | null, lo: number, hi: number, dflt: number) => {
  const n = Number(s);
  return s != null && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

export default function Lab() {
  const { wells, error, retry } = useWells();
  const [params, setParams] = useSearchParams();
  const mass = clampNum(params.get('m'), 10, 5000, 250);
  const members = clampNum(params.get('hh'), 1, 10, 5);
  const lpp = clampNum(params.get('lpp'), 2, 10, 5);
  const basis = params.get('basis') === 'low' ? 'low' : 'mid';
  const custom = params.get('preset') === 'custom';
  const [draft, setDraft] = useState<Draft>(() => {
    const d = toDraft(FE_RHA_LITERATURE);
    const q = params.get('q')?.split(','), de = params.get('d')?.split(',');
    if (custom && q?.length === 3 && de?.length === 3) return { ...d, q0: q[0], q1: q[1], q2: q[2], d0: de[0], d1: de[1], d2: de[2], b: params.get('b') ?? d.b, fbt: params.get('f') ?? d.fbt, cost: params.get('c') ?? d.cost };
    return d;
  });
  const parsed = draftToMedia(draft);
  const media: MediaParams = custom ? parsed.media ?? FE_RHA_LITERATURE : FE_RHA_LITERATURE;
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState({ days: '30', share: '90' });

  const set = (patch: Record<string, string | null>) => setParams(prev => {
    const n = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v == null) n.delete(k); else n.set(k, v); }
    return n;
  }, { replace: true });

  // Reflect custom media in the URL so a shared link restores the same view.
  useEffect(() => {
    if (!custom || !parsed.media) return;
    const m = parsed.media;
    set({ q: m.qmax.join(','), d: m.derate.join(','), b: String(m.b), f: String(m.fBT), c: String(m.pouchCostBDT) });
  }, [custom, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const sweep = useMemo(() => {
    if (!wells) return null;
    const t = performance.now();
    const r = designLabSweep(wells, media, mass, members, lpp);
    if (import.meta.env.DEV) console.debug(`[Kotodin] Design Lab sweep: ${(performance.now() - t).toFixed(1)} ms for ${wells.length} wells`);
    return r;
  }, [wells, media, mass, members, lpp]);

  const tDays = Number(target.days), tShare = Number(target.share) / 100;
  const targetValid = tDays >= 1 && tDays <= 365 && tShare > 0 && tShare <= 1;
  const found = useMemo(() => (wells && targetValid ? findMassForTarget(wells, media, members, lpp, tDays, tShare, basis) : null), [wells, media, members, lpp, tDays, tShare, basis, targetValid]);

  const st = sweep ? (basis === 'mid' ? sweep.mid : sweep.low) : null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="eyebrow">Design Lab · for filter designers</div>
          <h1 className="display mt-1 text-[clamp(26px,3.4vw,38px)] font-medium leading-tight">One pouch design, every surveyed well in Bangladesh.</h1>
          <p className="mt-2 text-[15px] text-ink-2">See how often households would need a new pouch across {wells ? fmtNum(wells.length) : '3,534'} real DPHE/BGS survey wells (1998–99), and what it would cost them each year.</p>
        </div>
        <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } }}>
          {copied ? <Check className="size-4 text-ok" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? 'Link copied' : 'Share these parameters'}
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Controls */}
        <Panel title="Pouch design" eyebrow="Parameters" className="h-fit lg:sticky lg:top-20">
          <div className="space-y-5 border-t border-line px-5 py-4">
            <Field label="Media preset" htmlFor="lab-preset">
              <select id="lab-preset" value={custom ? 'custom' : 'lit'} onChange={e => set({ preset: e.target.value === 'custom' ? 'custom' : null })} className={inputCls()}>
                <option value="lit">Fe-RHA (literature range)</option>
                <option value="custom">Your lab data (custom)</option>
              </select>
            </Field>
            <Slider id="lab-m" label="Pouch mass" unit="g" min={50} max={1000} step={10} value={mass} onChange={v => set({ m: String(v) })} />
            <Slider id="lab-hh" label="People per household" min={1} max={10} step={1} value={members} onChange={v => set({ hh: String(v) })} />
            <Slider id="lab-lpp" label="Litres per person per day" unit="L" min={2} max={10} step={0.5} value={lpp} onChange={v => set({ lpp: String(v) })} />
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-2">Forecast basis
                <InfoTip label="About the forecast basis">Central uses the mid literature values. Cautious uses the low values; it is what Kotodin’s replace-by dates are based on in a program.</InfoTip>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1 text-[13px]" role="radiogroup" aria-label="Forecast basis">
                {([['mid', 'Central'], ['low', 'Cautious']] as const).map(([v, l]) => (
                  <label key={v} className={cx('cursor-pointer rounded-md py-1.5 text-center font-medium', basis === v ? 'bg-surface shadow-soft' : 'text-muted')}>
                    <input type="radio" className="sr-only" checked={basis === v} onChange={() => set({ basis: v === 'low' ? 'low' : null })} />{l}
                  </label>
                ))}
              </div>
            </div>
            <details className="group rounded-lg border border-line" open={custom}>
              <summary className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium"><SlidersHorizontal className="size-4 text-water" aria-hidden />Isotherm &amp; cost{!custom && <span className="ml-auto text-xs font-normal text-muted">literature values</span>}</summary>
              <div className="border-t border-line p-3">
                {custom ? (
                  <>
                    <MediaEditor draft={draft} onChange={setDraft} idPrefix="lab" />
                    {parsed.error && <p role="alert" className="mt-2 text-xs text-bad">{parsed.error}. Showing literature values until fixed.</p>}
                  </>
                ) : (
                  <dl className="grid grid-cols-2 gap-y-1 text-xs tnum text-ink-2">
                    <dt className="text-muted">qmax (mg/g)</dt><dd>{media.qmax.join(' / ')}</dd>
                    <dt className="text-muted">b (L/mg)</dt><dd>{media.b}</dd>
                    <dt className="text-muted">derating</dt><dd>{media.derate.join(' / ')}</dd>
                    <dt className="text-muted">fBT</dt><dd>{media.fBT}</dd>
                    <dt className="text-muted">pouch cost</dt><dd>৳{media.pouchCostBDT} (placeholder)</dd>
                    <dd className="col-span-2 mt-1 text-muted">Switch the preset to “Your lab data” to edit.</dd>
                  </dl>
                )}
              </div>
            </details>
          </div>
        </Panel>

        {/* Outputs */}
        <div className="min-w-0 space-y-5">
          {error ? (
            <Panel><div className="px-6 py-12 text-center"><p className="font-medium">Couldn’t load the survey wells.</p><p className="mt-1 text-sm text-muted">Check the connection. Once loaded, the Design Lab works offline.</p><Button className="mt-4" onClick={retry}><RefreshCw className="size-4" aria-hidden />Try again</Button></div></Panel>
          ) : !sweep || !st ? (
            <div className="space-y-5" aria-busy="true" aria-label="Loading survey wells"><Skeleton className="h-28" /><Skeleton className="h-72" /><Skeleton className="h-96" /></div>
          ) : (
            <>
              <Panel className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-3">
                <Stat label="Replace more often than monthly" value={<span data-testid="pct-monthly">{fmtNum(st.pctUnder30, 0)}%</span>} tone={st.pctUnder30 > 50 ? 'bad' : st.pctUnder30 > 20 ? 'due' : 'water'} sub={`of ${fmtNum(sweep.analysed)} wells above 10 µg/L`} info="Share of filter-needing wells where the pouch would last under 30 days at these settings." />
                <Stat label="Median pouch life" value={`${fmtNum(st.medianDays ?? 0)} days`} sub={basis === 'mid' ? 'central estimate' : 'cautious estimate'} />
                <Stat label="Pouches per household per year" value={fmtNum(st.annualPouchesMedian ?? 0, 1)} sub="median household" info="365 ÷ pouch life, median across filter-needing wells." />
                <Stat label="Yearly cost per household" value={fmtBDT(st.annualCostMedianBDT ?? 0)} sub={`at ৳${media.pouchCostBDT} per pouch`} info="Median pouches per year × pouch cost. The cost per pouch is a placeholder until real production costs are known." />
                <Stat label="Wells where no filter is needed" value={`${fmtNum(sweep.pctNotNeeded, 0)}%`} sub={`${fmtNum(sweep.notNeeded)} of ${fmtNum(sweep.total)} at ≤ 10 µg/L`} />
                <Stat label="Wells analysed" value={fmtNum(sweep.analysed)} sub="survey wells above 10 µg/L" />
              </Panel>

              <Panel title="How long would the pouch last?" eyebrow="Wells per replacement interval (days)">
                <div className="border-t border-line px-5 py-4"><Histogram mid={sweep.mid.bins} low={sweep.low.bins} basis={basis} /></div>
              </Panel>

              <Panel title="Find the pouch size" eyebrow="Design target">
                <div className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4 text-sm">
                  <Field label="Share of households" htmlFor="ft-share"><div className="relative w-28"><input id="ft-share" type="number" min={1} max={100} value={target.share} onChange={e => setTarget(t => ({ ...t, share: e.target.value }))} className={inputCls()} /><span className="absolute right-3 top-2.5 text-muted">%</span></div></Field>
                  <span className="pb-2.5 text-ink-2">change the pouch at most once every</span>
                  <Field label="Days" htmlFor="ft-days"><input id="ft-days" type="number" min={1} max={365} value={target.days} onChange={e => setTarget(t => ({ ...t, days: e.target.value }))} className={cx(inputCls(), 'w-24')} /></Field>
                  <div className="min-w-[220px] flex-1 rounded-lg bg-water-50 px-4 py-2.5">
                    {!targetValid ? <span className="text-bad">Enter 1–100% and 1–365 days.</span>
                      : !found ? <span className="text-muted">No wells above 10 µg/L.</span>
                      : found.achievable ? (
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span>Needs a <strong className="tnum text-water-ink">{fmtNum(found.massG)} g</strong> pouch ({basis === 'mid' ? 'central' : 'cautious'})</span>
                          <Button size="sm" variant="water" onClick={() => set({ m: String(Math.max(10, found.massG)) })}><Crosshair className="size-4" aria-hidden />Apply</Button>
                        </span>
                      ) : <span>Not reachable under 5 kg of media ({fmtNum(found.massG)} g needed). Higher-capacity media is required.</span>}
                  </div>
                </div>
              </Panel>

              <Panel title="Where pouches run out fastest" eyebrow="Survey wells coloured by pouch life" className="overflow-hidden">
                <WellsMap wells={wells!} days={basis === 'mid' ? sweep.dMid : sweep.dLow} className="h-[460px] border-t border-line" />
                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 text-xs text-ink-2">
                  {BIN_LABELS.map((l, i) => <span key={l} className="inline-flex items-center gap-1.5"><span className="block size-2.5 rounded-full" style={{ background: BUCKET_COLORS[i] }} />{l} d</span>)}
                  <span className="inline-flex items-center gap-1.5"><span className="block size-2.5 rounded-full bg-[#B9B3A6]" />no filter needed</span>
                </div>
              </Panel>
              <p className="text-xs text-muted">Survey values are single samples from 1998–99; arsenic in a given well can change. Results describe the survey distribution, not any specific household today.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ id, label, unit, min, max, step, value, onChange }: { id: string; label: string; unit?: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">{label}</label>
        <span className="flex items-center gap-1">
          <input type="number" aria-label={`${label} value`} min={min} max={unit === 'g' ? 5000 : max} step={step} value={value} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= min) onChange(v); }} className="h-7 w-16 rounded-md border border-line-strong/80 bg-surface px-1.5 text-right text-[13px] font-semibold tnum focus:border-water focus:outline-none" />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.min(value, max)} onChange={e => onChange(Number(e.target.value))} className="w-full accent-water" />
    </div>
  );
}
