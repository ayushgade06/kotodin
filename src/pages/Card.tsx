import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, CircleAlert, Droplets, FlaskConical, OctagonX, Utensils } from 'lucide-react';
import { cardMedia, decodeCard, forecastPouch, todayISO } from '../engine';
import { formatDate, toBanglaDigits, translate, type Lang } from '../i18n';
import { Wordmark } from '../components/AppShell';
import { STATUS_STYLE, cx } from '../components/ui';

export default function Card() {
  const { hash } = useLocation();
  const payload = useMemo(() => decodeCard(hash.replace(/^#/, '')), [hash]);
  const [lang, setLang] = useState<Lang>(payload?.lang ?? 'bn');
  useEffect(() => { if (payload) setLang(payload.lang); }, [payload]);
  useEffect(() => { document.documentElement.lang = lang; document.title = payload ? `${payload.code} · Kotodin` : 'Kotodin card'; }, [lang, payload]);
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(lang, k, v);
  const num = (n: number) => (lang === 'bn' ? toBanglaDigits(n) : String(n));

  const f = useMemo(() => {
    if (!payload) return null;
    try {
      return forecastPouch({ c0: payload.c0, litresPerDay: payload.lpd, massG: payload.m, media: cardMedia(payload), k: payload.k, installedOn: payload.i, today: todayISO() });
    } catch { return null; }
  }, [payload]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-dvh bg-paper" lang={lang}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-5">
        <header className="flex items-center justify-between">
          <Wordmark />
          <button type="button" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')} className="no-print rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium" lang={lang === 'bn' ? 'en' : 'bn'}>
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );

  if (!payload || !f) {
    return shell(
      <div role="alert" className="my-auto rounded-2xl border border-bad/30 bg-surface p-6 text-center">
        <CircleAlert className="mx-auto size-10 text-bad" aria-hidden />
        <p className="mt-3 text-lg font-semibold">{t('card.invalid')}</p>
        <p className="mt-1 text-sm text-muted" lang={lang === 'bn' ? 'en' : 'bn'}>{translate(lang === 'bn' ? 'en' : 'bn', 'card.invalid')}</p>
      </div>,
    );
  }

  const notNeeded = f.status === 'not_needed';
  const left = f.daysLeft?.low ?? 0;
  const st = notNeeded ? 'not_needed' : left > 7 ? 'ok' : left > 0 ? 'due' : 'overdue';
  const style = STATUS_STYLE[st];
  const Icon = st === 'ok' ? Check : st === 'due' ? CircleAlert : st === 'overdue' ? OctagonX : Check;
  const remaining = f.days ? Math.max(0, 1 - f.daysElapsed / f.days.low) : 1;

  return shell(
    <>
      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>{t('card.household')} <strong className="text-ink tnum">{payload.code}</strong></span>
        <span>{t('card.installed', { date: formatDate(payload.i, lang) })}</span>
      </div>

      <section className={cx('mt-3 overflow-hidden rounded-3xl border bg-surface shadow-soft', st === 'overdue' ? 'border-bad/40' : st === 'due' ? 'border-due/40' : 'border-line')}>
        <div className={cx('flex items-center gap-2 px-5 py-3 text-[15px] font-semibold', style.bg, style.fg)}>
          <Icon className="size-5" aria-hidden strokeWidth={2.5} />
          {notNeeded ? translate(lang, 'status.not_needed') : st === 'overdue' ? t('card.changeNow') : t('card.title')}
        </div>
        {notNeeded ? (
          <p className="px-5 py-8 text-lg leading-relaxed">{t('card.notNeeded')}</p>
        ) : (
          <div className="flex items-center gap-4 px-5 py-6">
            <BigGlass level={remaining} color={style.dot} />
            <div className="min-w-0">
              <div data-testid="days-left" className={cx('font-bn text-[clamp(72px,24vw,112px)] font-bold leading-[0.9] tnum', style.fg)}>{num(Math.max(0, left))}</div>
              <div className="mt-1 text-2xl font-semibold">{t(left === 1 ? 'card.dayLeft' : 'card.daysLeft')}</div>
              {left < 0 && <div className="mt-1 text-sm font-medium text-bad">{t('card.overdueBy', { n: -left })}</div>}
            </div>
          </div>
        )}
        {!notNeeded && f.replaceBy && (
          <div className="border-t border-line bg-paper/60 px-5 py-3 text-[15px] font-medium">{t('card.replaceBy', { date: formatDate(f.replaceBy, lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</div>
        )}
      </section>

      {!notNeeded && (
        <ol className="mt-5 space-y-3">
          <Instr icon={<Droplets className="size-5" />}>{t('card.instr1')}</Instr>
          <Instr icon={<FlaskConical className="size-5" />}>{t('card.instr2')}</Instr>
          <Instr icon={<Utensils className="size-5" />}>{t('card.instr3')}</Instr>
        </ol>
      )}

      <details className="mt-5 rounded-xl border border-line bg-surface">
        <summary className="px-4 py-3 text-sm font-medium text-water">{t('card.how')}</summary>
        <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-ink-2">{t('card.howBody', { c0: payload.c0, lpd: payload.lpd, m: payload.m })}</p>
      </details>

      <p className="mt-auto pt-6 text-center text-xs text-muted">
        {t('card.estimate')} {translate(lang, 'footer.disclaimer')}
        <br /><Link to="/" className="no-print underline">{t('card.openApp')}</Link>
      </p>
    </>,
  );
}

function Instr({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li className="flex gap-3 rounded-xl bg-surface px-4 py-3 text-[16px] leading-snug border border-line"><span className="mt-0.5 shrink-0 text-water">{icon}</span><span>{children}</span></li>;
}

function BigGlass({ level, color }: { level: number; color: string }) {
  const top = 12 + (1 - Math.max(0, Math.min(1, level))) * 92;
  return (
    <svg viewBox="0 0 80 120" className="h-28 w-auto shrink-0" aria-hidden>
      <clipPath id="bg"><path d="M10 8h60l-7 100a6 6 0 0 1-6 5H23a6 6 0 0 1-6-5z" /></clipPath>
      <g clipPath="url(#bg)"><rect x="0" y={top} width="80" height="120" fill={color} opacity=".2" /><rect x="0" y={top} width="80" height="3" fill={color} /></g>
      <path d="M10 8h60l-7 100a6 6 0 0 1-6 5H23a6 6 0 0 1-6-5z" fill="none" stroke="#0F1B24" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
