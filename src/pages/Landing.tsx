import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FlaskConical, MapPinned, QrCode, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { addDays, encodeCard, FE_RHA_LITERATURE as P, todayISO } from '../engine';
import { useLang } from '../i18n';
import { ButtonLink, cx } from '../components/ui';

const STATS = [
  { n: '17.5 M', text: 'people in Bangladesh drink water above the national arsenic standard of 50 µg/L (11.8% of the population).', src: 'Bangladesh MICS 2019 water-quality report', href: 'https://washdata.org/report/bangladesh-2019-mics-report' },
  { n: '95%', text: 'of households in a 622-person filter study had abandoned their filter one year after field maintenance stopped.', src: 'Sanchez et al., Sci. Total Environ. 2016', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4907796' },
  { n: '3,534', text: 'wells from 61 of 64 districts in the national survey. Kotodin runs its Design Lab across every one of them.', src: 'DPHE/BGS National Hydrochemical Survey', href: 'https://www.bgs.ac.uk/groundwater/download/dphe-bgs-national-hydrochemical-survey/' },
];

export function sampleCardHash(daysAgo = 12) {
  return encodeCard({ v: 1, code: 'HH-021', c0: 120, lpd: 20, m: 1000, p: { qmax: P.qmax, b: P.b, derate: P.derate, fbt: P.fBT }, k: 1, i: addDays(todayISO(), -daysAgo), lang: 'bn' });
}

function Glass({ label, sub, bad }: { label: string; sub: string; bad?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <figure className="m-0 flex flex-col items-center">
      <svg viewBox="0 0 120 160" className="w-[clamp(96px,14vw,132px)] h-auto" aria-hidden>
        <defs>
          <clipPath id={`g${id}`}><path d="M18 14h84l-9 132a8 8 0 0 1-8 7H35a8 8 0 0 1-8-7z" /></clipPath>
          <linearGradient id={`w${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#CFE2E9" /><stop offset="1" stopColor="#A9CBD7" /></linearGradient>
        </defs>
        <g clipPath={`url(#g${id})`}>
          <rect x="0" y="46" width="120" height="120" fill={`url(#w${id})`} />
          <path d="M0 46c10 4 20 4 30 0s20-4 30 0 20 4 30 0 20-4 30 0v6H0z" fill="#9CC2D0">
            <animateTransform attributeName="transform" type="translate" values="0 0;-30 0;0 0" dur="6s" repeatCount="indefinite" />
          </path>
        </g>
        <path d="M18 14h84l-9 132a8 8 0 0 1-8 7H35a8 8 0 0 1-8-7z" fill="none" stroke="#0F1B24" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 30l-1 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      </svg>
      <figcaption className="mt-3 text-center">
        <div className="text-[13px] font-medium text-ink">{label}</div>
        <div className={cx('mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum', bad ? 'bg-bad-50 text-bad' : 'bg-ok-50 text-ok')}>{sub}</div>
      </figcaption>
    </figure>
  );
}

export default function Landing() {
  const { t, lang } = useLang();
  const cardHash = useMemo(() => sampleCardHash(), []);
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(#d8d2c5_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="animate-rise">
            <div className="eyebrow flex flex-wrap items-center gap-x-2">
              <span>Household arsenic filters</span><span aria-hidden>·</span><span>Bangladesh</span><span aria-hidden>·</span><span>SDG 6.1 &amp; 3.9</span>
            </div>
            <h1 lang={lang} className={cx('display mt-4 font-medium leading-[1.04] text-ink', lang === 'bn' ? 'text-[clamp(30px,4.4vw,50px)] leading-[1.25] font-bn' : 'text-[clamp(36px,5.6vw,66px)]')}>
              {t('hero.title')}
            </h1>
            <p lang={lang} className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">{t('hero.sub')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/program" variant="primary" size="lg">Open the demo program <ArrowRight className="size-4" aria-hidden /></ButtonLink>
              <ButtonLink to="/lab" size="lg">Try the Design Lab</ButtonLink>
              <Link to={`/card#${cardHash}`} className="inline-flex items-center gap-1 px-2 text-sm font-medium text-water hover:text-water-ink underline-offset-4 hover:underline">
                See a family card <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted">No sign-up. Works offline after the first visit. Demo households are synthetic; the well data is real.</p>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <div className="relative rounded-2xl border border-line bg-surface/80 p-6 shadow-soft sm:p-8">
              <div className="flex items-end justify-center gap-[clamp(20px,5vw,56px)]">
                <Glass label="Pouch, day 9" sub="✓ 2 µg/L out" />
                <Glass label="Pouch, day 74" sub="✕ 48 µg/L out" bad />
              </div>
              <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-2">
                Same colour. Same taste. <strong className="font-semibold text-ink">One is passing almost five times the WHO guideline.</strong>
                <span className="mt-1 block text-xs text-muted">Illustration. When adsorbent media saturates, nothing visible changes.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence */}
      <section aria-labelledby="evidence" className="border-y border-line bg-surface">
        <h2 id="evidence" className="sr-only">The evidence</h2>
        <div className="mx-auto grid max-w-[1200px] divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {STATS.map(s => (
            <div key={s.n} className="py-8 md:px-8 first:md:pl-0 last:md:pr-0">
              <div className="display text-[44px] font-medium leading-none tnum text-ink">{s.n}</div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
              <a href={s.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
                {s.src}<ArrowUpRight className="size-3" aria-hidden />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <div className="eyebrow">How Kotodin works</div>
          <h2 id="how" className="display mt-3 text-[clamp(28px,3.6vw,40px)] font-medium leading-tight">A fixed “change it every three months” rule is wrong for almost everyone.</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">Arsenic in Bangladeshi wells ranges from under 10 to over 500 µg/L. A pouch that lasts a year on one well can be spent in a fortnight on the next. Kotodin gives every household its own forecast.</p>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          <Step n={1} title="Forecast each filter" body="Well arsenic × daily water use ÷ media capacity gives a replace-by date, with an honest low–high band. Every number is shown and editable.">
            <code className="block rounded-md bg-paper px-3 py-2 font-mono text-[12.5px] text-ink-2">days = capacity ÷ (C₀ × litres/day)</code>
          </Step>
          <Step n={2} title="Run the maintenance" body="A visit queue ranked by exposure and urgency, Bangla QR stickers with a live countdown, and a pouch-stock forecast for the next 30–90 days.">
            <div className="flex items-center justify-between rounded-md bg-paper px-3 py-2 text-[12.5px]"><span className="font-semibold">HH-014</span><span className="text-bad">Overdue 5 days · 6 people</span></div>
          </Step>
          <Step n={3} title="Learn from every test" body="When a field test catches a breakthrough, the observed capacity recalibrates the forecast for every filter in the program.">
            <div className="rounded-md bg-paper px-3 py-2 font-mono text-[12.5px] text-ink-2">k 1.00 → <span className="font-semibold text-water">0.70</span> · 3 filters now due</div>
          </Step>
        </ol>
      </section>

      {/* Surfaces */}
      <section aria-labelledby="who" className="border-t border-line bg-paper-2/40">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
          <div className="eyebrow">Built for three people</div>
          <h2 id="who" className="display mt-3 max-w-2xl text-[clamp(28px,3.6vw,40px)] font-medium leading-tight">The field worker, the family and the filter designer.</h2>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            <Surface to="/program" icon={<MapPinned className="size-5" />} who="Program teams" title="Who needs a visit this week?" body="Map, visit queue, household forecasts, field-test log and fleet calibration for a 40-filter pilot." />
            <Surface to={`/card#${cardHash}`} icon={<Smartphone className="size-5" />} who="Families" title="কত দিন বাকি? How many days are left?" body="Scan the sticker on the filter: a Bangla countdown, plain instructions, no app or account needed." />
            <Surface to="/lab" icon={<FlaskConical className="size-5" />} who="Filter designers" title="How big should the pouch be?" body="Plug in lab isotherm results and see replacement intervals and yearly cost across 3,534 real wells." />
          </ul>
        </div>
      </section>

      {/* Principles + SDG */}
      <section aria-labelledby="honest" className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="eyebrow">Honest by design</div>
          <h2 id="honest" className="display mt-3 text-[clamp(26px,3vw,34px)] font-medium leading-tight">A planning aid that shows its working.</h2>
          <ul className="mt-6 space-y-4 text-[15px] text-ink-2">
            <Principle icon={<ShieldCheck className="size-5" />}>Media parameters are literature ranges, labelled as assumptions until a lab measures them. Only a water test confirms safety.</Principle>
            <Principle icon={<QrCode className="size-5" />}>No personal data. Households are codes; the family card carries its numbers in the link itself and never touches a server.</Principle>
            <Principle icon={<WifiOff className="size-5" />}>Installable and offline after the first visit, for field work with patchy data.</Principle>
          </ul>
          <Link to="/methods" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-water hover:text-water-ink">Read the methods &amp; limits <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="eyebrow">UN Sustainable Development Goals</div>
            <dl className="mt-4 space-y-3 text-sm">
              <Sdg code="6.1" text="Safe and affordable drinking water for all" />
              <Sdg code="3.9" text="Reduce illness from hazardous chemicals and water contamination" />
              <Sdg code="6.b" text="Support local communities in improving water management" />
            </dl>
          </div>
          <div className="rounded-2xl border border-water/25 bg-water-50 p-6 text-sm text-ink-2">
            <strong className="text-ink">Have a tested, safer well nearby?</strong> Switching to a low-arsenic well is often better than filtering. Kotodin is for households that need treatment and can’t switch.
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col bg-surface p-6 sm:p-7">
      <span className="display text-sm font-semibold text-water tnum">0{n}</span>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-5">{children}</div>
    </li>
  );
}

function Surface({ to, icon, who, title, body }: { to: string; icon: React.ReactNode; who: string; title: string; body: string }) {
  return (
    <li>
      <Link to={to} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 sm:gap-6">
        <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-water transition-colors group-hover:bg-water group-hover:text-white">{icon}</span>
        <span className="min-w-0">
          <span className="eyebrow block">{who}</span>
          <span className="mt-1 block text-lg font-semibold tracking-[-0.01em]">{title}</span>
          <span className="mt-1 block text-[14.5px] text-ink-2">{body}</span>
        </span>
        <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}

function Principle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li className="flex gap-3"><span className="mt-0.5 text-water">{icon}</span><span>{children}</span></li>;
}

function Sdg({ code, text }: { code: string; text: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-12 shrink-0 rounded-md bg-ink px-2 py-1 text-center text-xs font-semibold text-paper tnum">{code}</dt>
      <dd className="text-ink-2">{text}</dd>
    </div>
  );
}
