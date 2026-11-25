import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Check, CircleAlert, CircleHelp, CircleMinus, Info, Loader2, OctagonX, TriangleAlert, X } from 'lucide-react';
import type { Status } from '../engine';
import { useLang } from '../i18n';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'water';
type Size = 'sm' | 'md' | 'lg';
export function btn(variant: Variant = 'secondary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none rounded-[9px] transition-[background-color,box-shadow,transform,color,border-color] duration-150',
    'active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2',
    size === 'sm' && 'h-8 px-3 text-[13px]',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'lg' && 'h-12 px-5 text-[15px]',
    variant === 'primary' && 'bg-ink text-paper shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(15_27_36/0.3)] hover:bg-ink-2',
    variant === 'water' && 'bg-water text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(20_85_105/0.35)] hover:bg-water-ink',
    variant === 'secondary' && 'bg-surface text-ink border border-line-strong/80 shadow-soft hover:bg-paper hover:border-line-strong',
    variant === 'ghost' && 'text-ink-2 hover:bg-ink/5 hover:text-ink',
    variant === 'danger' && 'bg-surface text-bad border border-bad/30 hover:bg-bad-50',
    extra,
  );
}

export function Button({ variant, size, loading, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={btn(variant, size, className)}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link {...rest} className={btn(variant, size, className)} />;
}

/* ---------- Surfaces ---------- */
export function Panel({ title, eyebrow, actions, children, className, id }: { title?: ReactNode; eyebrow?: string; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('bg-surface border border-line rounded-[var(--radius-card)] shadow-soft', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------- Status ---------- */
export const STATUS_STYLE: Record<Status, { fg: string; bg: string; dot: string; Icon: typeof Check }> = {
  ok: { fg: 'text-ok', bg: 'bg-ok-50', dot: '#2E7D4F', Icon: Check },
  due: { fg: 'text-due-ink', bg: 'bg-due-50', dot: '#B7791F', Icon: CircleAlert },
  overdue: { fg: 'text-bad', bg: 'bg-bad-50', dot: '#B42318', Icon: OctagonX },
  failed: { fg: 'text-bad', bg: 'bg-bad-50', dot: '#B42318', Icon: TriangleAlert },
  not_needed: { fg: 'text-grey', bg: 'bg-grey-50', dot: '#7A828B', Icon: CircleMinus },
  unknown_influent: { fg: 'text-grey', bg: 'bg-grey-50', dot: '#7A828B', Icon: CircleHelp },
};

export function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const { t } = useLang();
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap', s.fg, s.bg, size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]')}>
      <s.Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden strokeWidth={2.25} />
      {t(`status.${status}`)}
    </span>
  );
}

/** The product motif: a glass whose water level is the remaining pouch capacity. */
export function FillGlass({ level, status, size = 28, className }: { level: number; status: Status; size?: number; className?: string }) {
  const id = useId();
  const l = Math.max(0, Math.min(1, level));
  const color = STATUS_STYLE[status].dot;
  const top = 5 + (1 - l) * 21;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden>
      <defs><clipPath id={id}><path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y={top} width="28" height="28" fill={color} opacity="0.22" />
        <rect x="0" y={top} width="28" height="1.6" fill={color} />
      </g>
      <path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Data display ---------- */
export function Stat({ label, value, sub, tone, info }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'bad' | 'due' | 'water'; info?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[12.5px] text-muted">
        <span className="truncate">{label}</span>
        {info && <InfoTip label={`How “${label}” is calculated`}>{info}</InfoTip>}
      </div>
      <div className={cx('mt-1 text-2xl font-semibold tnum tracking-[-0.02em]', tone === 'bad' && 'text-bad', tone === 'due' && 'text-due-ink', tone === 'water' && 'text-water')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Small ⓘ disclosure that explains a number. Closes on outside click or Escape. */
export function InfoTip({ label, children, align = 'left' }: { label: string; children: ReactNode; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);
  return (
    <details ref={ref} className="relative inline-block align-middle"
      onToggle={e => { const d = e.currentTarget; if (d.open) setFlip(d.getBoundingClientRect().left + 300 > window.innerWidth); }}>
      <summary aria-label={label} className="grid place-items-center size-5 rounded-full text-muted hover:text-water hover:bg-water-50 list-none">
        <Info className="size-3.5" aria-hidden />
      </summary>
      <div className={cx('absolute z-30 top-6 w-72 max-w-[min(18rem,calc(100vw-32px))] rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed text-ink-2 shadow-pop font-normal normal-case tracking-normal', align === 'right' || flip ? 'right-0' : 'left-0')}>
        {children}
      </div>
    </details>
  );
}

export function EmptyState({ icon, title, body, actions }: { icon?: ReactNode; title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      {icon && <div className="mb-4 grid place-items-center size-12 rounded-full bg-water-50 text-water">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-paper-2', className)} aria-hidden />;
}

/* ---------- Forms ---------- */
export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2 mb-1.5">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1 text-xs text-bad">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputCls = (invalid?: boolean) => cx(
  'block w-full h-10 rounded-lg border bg-surface px-3 text-sm tnum transition-colors placeholder:text-muted/70',
  'focus:outline-none focus:ring-2 focus:ring-water/30 focus:border-water',
  invalid ? 'border-bad' : 'border-line-strong/80 hover:border-line-strong',
);

/* ---------- Dialog (native <dialog>) ---------- */
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className={cx('m-auto w-[calc(100%-24px)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop open:animate-toast', wide ? 'max-w-3xl' : 'max-w-lg')}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="display text-xl font-medium">{title}</h2>
        <button type="button" onClick={onClose} className={btn('ghost', 'sm', 'px-2')} aria-label="Close"><X className="size-4" /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3">{footer}</div>}
    </dialog>
  );
}
