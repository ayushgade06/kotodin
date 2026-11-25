import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Database, Download, FlaskConical, MoreHorizontal, Plus, Printer, RotateCcw, Search, Share2, Upload } from 'lucide-react';
import { stockForecast, visitQueue, FE_RHA_LITERATURE, type Status } from '../engine';
import { useProgram } from '../state/ProgramContext';
import { useToast } from '../components/Toast';
import { Button, ButtonLink, Dialog, EmptyState, FillGlass, InfoTip, Panel, Skeleton, Stat, StatusBadge, btn, cx, inputCls } from '../components/ui';
import { ProgramMap } from '../components/maps';
import { AddHouseholdDialog } from '../components/AddHousehold';
import { MediaEditor, draftToMedia, toDraft } from '../components/MediaEditor';
import { fmtBDT, fmtDate, fmtNum, fmtShort, plural, remainingLow, whyLine } from '../components/format';
import { useLang } from '../i18n';
import type { HouseholdRow } from '../state/derive';

export function DemoBanner() {
  const { t, lang } = useLang();
  return (
    <div lang={lang} className="flex items-start gap-2 rounded-lg border border-due/30 bg-due-50 px-3 py-2 text-[13px] text-due-ink">
      <Database className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{t('demo.banner')}</span>
    </div>
  );
}

export function ProgramGate({ children }: { children: React.ReactNode }) {
  const p = useProgram();
  if (p.status === 'loading') {
    return (
      <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading the demo program">
        <Skeleton className="h-9 w-80" /><Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-[5fr_7fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      </div>
    );
  }
  if (!p.state) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <Panel>
          <EmptyState
            icon={<Database className="size-5" />}
            title={p.status === 'error' ? 'Couldn’t load the survey data to build the demo.' : p.corrupt ? 'The saved program on this device couldn’t be read.' : 'No program yet.'}
            body={p.status === 'error' ? 'Check your connection and try again. Your own program data never leaves this device.' : 'Start with the demo program (40 synthetic households on real survey wells), or create an empty program for your own filters.'}
            actions={<>
              <Button variant="primary" onClick={() => void p.startDemo()}>{p.status === 'error' ? 'Try again' : 'Start with the demo program'}</Button>
              <Button onClick={p.createEmpty}>Create empty program</Button>
            </>}
          />
        </Panel>
      </div>
    );
  }
  return <>{children}</>;
}

type SortKey = 'code' | 'status' | 'c0' | 'members' | 'age' | 'left';
const STATUS_ORDER: Record<Status, number> = { failed: 0, overdue: 1, due: 2, ok: 3, unknown_influent: 4, not_needed: 5 };
const FILTERS = [['all', 'All'], ['queue', 'Needs a visit'], ['ok', 'OK'], ['other', 'No forecast']] as const;

export default function Program() {
  return <ProgramGate><Dashboard /></ProgramGate>;
}

function Dashboard() {
  const p = useProgram();
  const toast = useToast();
  const nav = useNavigate();
  const d = p.derived!;
  const s = p.state!;
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'status', dir: 1 });
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);

  const queue = useMemo(() => visitQueue(d.rows, p.today), [d.rows, p.today]);
  const stock = useMemo(() => [30, 60, 90].map(h => stockForecast(d.rows, p.today, h)), [d.rows, p.today]);
  const points = useMemo(() => d.rows.map(r => ({ id: r.householdId, code: r.code, lat: r.household.lat, lon: r.household.lon, status: r.forecast.status, label: whyLine(r) })), [d.rows]);
  const count = (st: Status[]) => d.rows.filter(r => st.includes(r.forecast.status)).length;
  const active = d.rows.filter(r => r.forecast.status !== 'not_needed').length;
  const cal = d.calibration;
  const pct = Math.round(Math.abs(1 - cal.k) * 100);

  const rows = useMemo(() => {
    const val = (r: HouseholdRow): number | string => {
      switch (sort.key) {
        case 'code': return r.code;
        case 'status': return STATUS_ORDER[r.forecast.status] * 1e4 + (r.forecast.daysLeft?.low ?? 0);
        case 'c0': return r.c0 ?? -1;
        case 'members': return r.members;
        case 'age': return r.forecast.daysElapsed;
        case 'left': return r.forecast.daysLeft?.low ?? 1e9;
      }
    };
    return d.rows
      .filter(r => filter === 'all' || (filter === 'queue' ? ['failed', 'overdue', 'due'].includes(r.forecast.status) : filter === 'ok' ? r.forecast.status === 'ok' : ['not_needed', 'unknown_influent'].includes(r.forecast.status)))
      .filter(r => r.code.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.code.localeCompare(b.code); });
  }, [d.rows, filter, q, sort]);

  const share = () => {
    const lines = queue.map((it, i) => `${i + 1}. ${it.row.code}: ${whyLine(it.row)}`);
    const text = `Kotodin visit list, ${fmtDate(p.today)} (${s.program.name})\n${lines.join('\n') || 'No visits needed.'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const printIds = selected.size ? [...selected] : queue.map(i => i.row.householdId);
  const closeMore = () => { if (moreRef.current) moreRef.current.open = false; };
  const toggleSort = (key: SortKey) => setSort(o => ({ key, dir: o.key === key ? (o.dir === 1 ? -1 : 1) : 1 }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">Program dashboard · {fmtDate(p.today)}</div>
          <h1 className="display mt-1 text-[clamp(26px,3.4vw,36px)] font-medium leading-tight">{s.program.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Media: <button type="button" onClick={() => setMediaOpen(true)} className="font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">{d.media.name}</button>
            {' '}· target ≤ 10 µg/L (WHO guideline)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => setAddOpen(true)}><Plus className="size-4" aria-hidden />Add household</Button>
          <ButtonLink to={`/program/stickers?ids=${printIds.join(',')}`} aria-disabled={!printIds.length} className={cx(!printIds.length && 'pointer-events-none opacity-50')}>
            <Printer className="size-4" aria-hidden />{selected.size ? `Print ${selected.size} stickers` : 'Print stickers (queue)'}
          </ButtonLink>
          <details ref={moreRef} className="relative">
            <summary className={btn('secondary', 'md', 'list-none px-3')} aria-label="More actions"><MoreHorizontal className="size-4" /></summary>
            <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop" role="menu">
              <MenuItem icon={<FlaskConical />} onClick={() => { closeMore(); setMediaOpen(true); }}>Filter media settings</MenuItem>
              <MenuItem icon={<Download />} onClick={() => { closeMore(); p.exportFile(); }}>Export program (JSON)</MenuItem>
              <MenuItem icon={<Upload />} onClick={() => { closeMore(); fileRef.current?.click(); }}>Import program (JSON)</MenuItem>
              <MenuItem icon={<RotateCcw />} danger onClick={() => { closeMore(); setResetOpen(true); }}>Reset to demo program</MenuItem>
            </div>
          </details>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import program file" onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            try { p.importFile(await f.text()); toast({ tone: 'success', title: 'Program imported' }); }
            catch (err) { toast({ tone: 'warn', title: 'Import failed', body: err instanceof Error ? err.message : undefined }); }
          }} />
        </div>
      </div>

      {s.program.isDemo && <DemoBanner />}

      {/* KPIs */}
      <Panel className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Filters active" value={fmtNum(active)} sub={`${plural(count(['not_needed']), 'home')} need none`} info="Households whose well is above 10 µg/L arsenic, or not yet tested." />
        <Stat label="Due this week" value={fmtNum(count(['due']))} tone={count(['due']) ? 'due' : undefined} sub="≤ 7 days left (cautious)" info="Conservative forecast: replace-by date = install date + the low-band days to breakthrough." />
        <Stat label="Overdue or failed" value={fmtNum(count(['overdue', 'failed']))} tone={count(['overdue', 'failed']) ? 'bad' : undefined} sub={`${plural(count(['failed']), 'failed test')}`} info="Overdue: past the cautious replace-by date. Failed: an effluent test at or above 10 µg/L since the pouch was installed." />
        <Stat label="Calibration k" value={cal.k.toFixed(2)} tone={cal.k !== 1 ? 'water' : undefined} sub={cal.n >= cal.needed ? `from ${plural(cal.n, 'field test')}` : `${cal.n} of ${cal.needed} tests needed`} info="k multiplies every filter’s capacity. It is the median of observed ÷ predicted capacity across pouches whose breakthrough was caught by a field test (needs ≥ 3; clamped to 0.2–2.0)." />
        <Stat label="Pouches, next 30 days" value={fmtNum(stock[0].pouches)} sub={fmtBDT(stock[0].costBDT)} info={<>Replacing each filter on its cautious cycle. 60 days: {fmtNum(stock[1].pouches)} ({fmtBDT(stock[1].costBDT)}); 90 days: {fmtNum(stock[2].pouches)} ({fmtBDT(stock[2].costBDT)}). Pouch cost ৳{d.media.pouchCostBDT} is a placeholder assumption.</>} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[5fr_7fr]">
        <div className="min-w-0 space-y-5">
          {/* Queue */}
          <Panel title="Visit this week" eyebrow={`${plural(queue.length, 'household')}, highest priority first`}
            actions={<Button size="sm" variant="ghost" onClick={share} aria-label="Share visit list on WhatsApp" disabled={!queue.length}><Share2 className="size-4" aria-hidden />Share</Button>}>
            {queue.length === 0 ? (
              <EmptyState title="No visits needed this week" body="Every filter has more than 7 days left on its cautious forecast." />
            ) : (
              <ol className="max-h-[460px] overflow-y-auto border-t border-line" aria-label="Visit queue">
                {queue.map((it, i) => (
                  <li key={it.row.householdId} className={cx('border-b border-line last:border-b-0', p.highlight.has(it.row.householdId) && 'animate-flash')}>
                    <Link to={`/program/h/${it.row.householdId}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-paper/70">
                      <span className="w-5 text-right text-xs font-medium text-muted tnum">{i + 1}</span>
                      <FillGlass level={remainingLow(it.row.forecast)} status={it.status} size={26} className="shrink-0 text-ink-2" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2"><span className="font-semibold tnum">{it.row.code}</span><StatusBadge status={it.status} size="sm" /></span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted">{whyLine(it.row)}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
              Priority = (arsenic ÷ 10) × people × urgency.{' '}
              <InfoTip label="How the visit priority works" align="right">Urgency is 3 for a failed test, 2–3 for overdue (rising over 30 days), 1 for due this week. Exposure is (C₀ ÷ 10 µg/L) × household members, so a large family on a 300 µg/L well comes before a couple on a 40 µg/L well.</InfoTip>
            </p>
          </Panel>

          {/* Calibration */}
          <Panel title="Fleet calibration" eyebrow="Learns from field tests">
            <div className="px-5 pb-5">
              <div className="flex items-baseline gap-3">
                <span className="display text-4xl font-medium tnum text-water">k = {cal.k.toFixed(2)}</span>
                {cal.n >= cal.needed && cal.clamped && <span className="text-xs text-due-ink">clamped to 0.2–2.0</span>}
              </div>
              {cal.n >= cal.needed ? (
                <p className="mt-2 text-sm text-ink-2">From {plural(cal.n, 'failing field test')}: pouches last about <strong>{pct}% {cal.k < 1 ? 'less' : 'more'}</strong> than the lab-based mid estimate. Every forecast in this program is scaled by k.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink-2">Needs ≥ {cal.needed} failing effluent tests to calibrate. Until then forecasts use the lab-based parameters (k = 1).</p>
                  <div className="mt-3 flex items-center gap-2" aria-label={`${cal.n} of ${cal.needed} breakthrough tests recorded`}>
                    {Array.from({ length: cal.needed }, (_, i) => <span key={i} className={cx('h-2 flex-1 rounded-full', i < cal.n ? 'bg-water' : 'bg-paper-2 border border-line')} />)}
                    <span className="ml-1 text-xs font-medium text-muted tnum">{cal.n}/{cal.needed}</span>
                  </div>
                </>
              )}
              {cal.ratios.length > 0 && (
                <p className="mt-3 text-xs text-muted tnum">Observed ÷ predicted capacity per breakthrough: {cal.ratios.map(r => r.toFixed(2)).join(', ')}</p>
              )}
            </div>
          </Panel>
        </div>

        {/* Map */}
        <Panel title="Map" eyebrow="Click a marker to open the household" className="flex flex-col overflow-hidden">
          <ProgramMap points={points} highlight={p.highlight} onOpen={id => nav(`/program/h/${id}`)} className="h-[380px] border-t border-line lg:h-full lg:min-h-[520px] lg:flex-1" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-5 py-2.5 text-xs text-ink-2">
            {(['ok', 'due', 'overdue', 'failed', 'not_needed'] as Status[]).map(st => <MapLegend key={st} status={st} />)}
          </div>
        </Panel>
      </div>

      {/* Table */}
      <Panel title="All households" eyebrow={`${plural(d.rows.length, 'household')}`}
        actions={<div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted" aria-hidden /><input aria-label="Search by household code" placeholder="HH-0…" value={q} onChange={e => setQ(e.target.value)} className={cx(inputCls(), 'h-8 w-32 pl-8 text-[13px]')} /></div>}>
        <div className="flex flex-wrap gap-1 px-5 pb-3" role="tablist" aria-label="Filter households">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={cx('h-7 rounded-full px-3 text-[13px] font-medium transition-colors', filter === k ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-ink/5')}>{label}</button>
          ))}
        </div>
        <div className="relative overflow-x-auto border-t border-line">
          <table className="w-full min-w-[760px] text-sm tnum">
            <thead className="bg-paper/60 text-left text-[12.5px] text-muted">
              <tr>
                <th className="w-10 py-2.5 pl-5"><input type="checkbox" aria-label="Select all shown" checked={rows.length > 0 && rows.every(r => selected.has(r.householdId))} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.householdId)) : new Set())} className="size-4 accent-ink" /></th>
                <Th k="code" sort={sort} on={toggleSort}>Household</Th>
                <Th k="status" sort={sort} on={toggleSort}>Status</Th>
                <Th k="c0" sort={sort} on={toggleSort}>Well arsenic</Th>
                <Th k="members" sort={sort} on={toggleSort}>People</Th>
                <Th k="age" sort={sort} on={toggleSort}>Pouch age</Th>
                <Th k="left" sort={sort} on={toggleSort}>Days left (cautious–central)</Th>
                <th className="py-2.5 pr-5 font-medium">Replace by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const f = r.forecast;
                return (
                  <tr key={r.householdId} className={cx('border-t border-line hover:bg-paper/50', p.highlight.has(r.householdId) && 'animate-flash')}>
                    <td className="py-2.5 pl-5"><input type="checkbox" aria-label={`Select ${r.code}`} checked={selected.has(r.householdId)} onChange={e => setSelected(o => { const n = new Set(o); if (e.target.checked) n.add(r.householdId); else n.delete(r.householdId); return n; })} className="size-4 accent-ink" /></td>
                    <td><Link to={`/program/h/${r.householdId}`} className="font-semibold underline-offset-4 hover:underline">{r.code}</Link></td>
                    <td><StatusBadge status={f.status} size="sm" /></td>
                    <td>{r.c0 != null ? <>{fmtNum(r.c0)} µg/L <SourceTag s={r.household.influentSource} /></> : <span className="text-muted">not tested</span>}</td>
                    <td>{r.members}</td>
                    <td>{plural(f.daysElapsed, 'day')}</td>
                    <td>{f.daysLeft ? `${fmtNum(f.daysLeft.low)} – ${fmtNum(f.daysLeft.mid)}` : '—'}</td>
                    <td className="pr-5">{f.replaceBy ? fmtShort(f.replaceBy) : '—'}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">{d.rows.length ? 'No households match this filter.' : 'No households yet. Add your first one to see its forecast.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <AddHouseholdDialog open={addOpen} onClose={() => setAddOpen(false)} points={points} today={p.today} defaultMassG={s.filters[0]?.pouchMassG ?? 1000}
        onAdd={h => { const id = p.addHousehold(h); setAddOpen(false); toast({ tone: 'success', title: 'Household added', body: 'Its forecast is on the map, table and queue.' }); nav(`/program/h/${id}`); }} />

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset to the demo program?"
        footer={<><Button onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => { setResetOpen(false); await p.startDemo(); toast({ tone: 'success', title: 'Demo program restored' }); }}>Reset</Button></>}>
        <p className="text-sm text-ink-2">This replaces the program on this device with a fresh copy of the demo. Export first if you want to keep your changes.</p>
      </Dialog>

      <MediaDialog open={mediaOpen} onClose={() => setMediaOpen(false)} />
    </div>
  );
}

function MediaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProgram();
  const toast = useToast();
  const current = p.derived!.media;
  const [mode, setMode] = useState<'lit' | 'custom'>(current.source === 'custom' ? 'custom' : 'lit');
  const [draft, setDraft] = useState(() => toDraft(current));
  const parsed = draftToMedia(draft);
  const save = () => {
    const m = mode === 'lit' ? FE_RHA_LITERATURE : parsed.media;
    if (!m) return;
    p.setMedia(m); onClose();
    toast({ tone: 'success', title: 'Media updated', body: 'Every forecast in the program now uses these parameters.' });
  };
  return (
    <Dialog open={open} onClose={onClose} title="Filter media" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={mode === 'custom' && !parsed.media}>Apply to program</Button></>}>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1" role="radiogroup" aria-label="Media preset">
          {([['lit', 'Fe-RHA (literature range)'], ['custom', 'Your lab data']] as const).map(([v, l]) => (
            <label key={v} className={cx('cursor-pointer rounded-md px-2 py-1.5 text-center text-[13px] font-medium', mode === v ? 'bg-surface shadow-soft' : 'text-muted')}>
              <input type="radio" className="sr-only" checked={mode === v} onChange={() => { setMode(v); if (v === 'lit') setDraft(toDraft(FE_RHA_LITERATURE)); }} />{l}
            </label>
          ))}
        </div>
        {mode === 'lit' ? (
          <p className="text-ink-2">Published ranges for iron-modified rice-husk materials. Every value is an <strong>assumption</strong> until your own isotherm is measured; see <Link to="/methods" className="text-water underline">Methods</Link>.</p>
        ) : (
          <>
            <p className="text-ink-2">Enter your measured Langmuir isotherm and field derating. Bands must be ordered low ≤ mid ≤ high.</p>
            <MediaEditor draft={draft} onChange={setDraft} idPrefix="pm" />
            {parsed.error && <p role="alert" className="text-xs text-bad">{parsed.error}</p>}
          </>
        )}
      </div>
    </Dialog>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactElement; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cx('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-paper [&_svg]:size-4 [&_svg]:text-muted', danger && 'text-bad [&_svg]:text-bad')}>
      {icon}{children}
    </button>
  );
}

function Th({ k, sort, on, children }: { k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; on: (k: SortKey) => void; children: React.ReactNode }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <th className="py-2.5 font-medium" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => on(k)} className={cx('inline-flex items-center gap-1 rounded hover:text-ink', active && 'text-ink')}>{children}<Icon className="size-3.5" aria-hidden /></button>
    </th>
  );
}

function SourceTag({ s }: { s: string }) {
  return s === 'bgs_nearest'
    ? <span className="ml-1 rounded bg-due-50 px-1.5 py-0.5 text-[11px] font-medium text-due-ink" title="Median of nearest survey wells: an estimate, not a test">estimate</span>
    : <span className="ml-1 rounded bg-water-50 px-1.5 py-0.5 text-[11px] font-medium text-water-ink" title="Field test of this well">tested</span>;
}

function MapLegend({ status }: { status: Status }) {
  const { t } = useLang();
  const shape: Record<string, React.ReactNode> = {
    ok: <circle cx="6" cy="6" r="4.5" />, due: <path d="M6 1 11 6 6 11 1 6z" />, overdue: <rect x="1.5" y="1.5" width="9" height="9" rx="1" />,
    failed: <path d="M6 1 11.5 10.5H.5z" />, not_needed: <circle cx="6" cy="6" r="3.2" />,
  };
  const colors: Record<string, string> = { ok: '#2E7D4F', due: '#B7791F', overdue: '#B42318', failed: '#B42318', not_needed: '#7A828B' };
  return <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><g fill={colors[status]}>{shape[status]}</g></svg>{t(`status.${status}` as const)}</span>;
}
