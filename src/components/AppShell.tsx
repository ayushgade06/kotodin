import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useLang } from '../i18n';
import { btn, cx } from './ui';

export const REPO_URL = 'https://github.com/ayushgade06/kotodin';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden>
        <clipPath id="wm"><path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z" /></clipPath>
        <g clipPath="url(#wm)"><rect x="0" y="13" width="28" height="20" fill="#1C6E8C" /><path d="M0 13c3 1.6 6 1.6 9 0s6-1.6 9 0 6 1.6 10 0v2H0z" fill="#145569" /></g>
        <path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z" fill="none" stroke="#0F1B24" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <span className="display text-[19px] font-semibold leading-none">Kotodin</span>
      <span lang="bn" className="hidden sm:inline text-[13px] text-muted leading-none pt-0.5">কতদিন</span>
    </span>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => cx('relative px-2.5 py-1.5 text-[13.5px] rounded-md transition-colors', isActive ? 'text-ink font-medium bg-ink/[0.06]' : 'text-ink-2 hover:text-ink hover:bg-ink/[0.04]')}>
      {children}
    </NavLink>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <button type="button" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} aria-label={t('lang.toggleLabel')} className={btn('secondary', 'sm', className)}>
      <Languages className="size-4" aria-hidden />
      <span lang={lang === 'en' ? 'bn' : 'en'}>{t('lang.toggle')}</span>
    </button>
  );
}

export function AppShell() {
  const { t, lang } = useLang();
  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">{t('nav.skip')}</a>
      <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:px-6">
          <Link to="/" aria-label="Kotodin home" className="rounded-md py-1"><Wordmark /></Link>
          <nav aria-label="Main" className="order-3 -mx-2 flex w-full items-center gap-0.5 sm:order-none sm:mx-0 sm:w-auto" lang={lang}>
            <NavItem to="/program">{t('nav.program')}</NavItem>
            <NavItem to="/lab">{t('nav.lab')}</NavItem>
            <NavItem to="/methods">{t('nav.methods')}</NavItem>
          </nav>
          <div className="ml-auto"><LangToggle /></div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <ErrorBoundary><Outlet /></ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="no-print border-t border-line bg-paper-2/50">
      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 text-[13px] text-muted sm:px-6 md:grid-cols-[1.2fr_1fr]" lang={lang}>
        <div className="space-y-2">
          <Wordmark />
          <p className="font-medium text-ink-2">{t('footer.disclaimer')}</p>
          <p>{t('footer.affil')}</p>
        </div>
        <div className="space-y-2">
          <p>{t('footer.data')}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/methods" className="underline decoration-line-strong underline-offset-4 hover:text-ink">{t('nav.methods')}</Link>
            <a href={REPO_URL} className="underline decoration-line-strong underline-offset-4 hover:text-ink">Source code</a>
            <span>{t('footer.license')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn('Kotodin page error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="display text-3xl font-medium">Something went wrong on this page.</h1>
        <p className="mt-3 text-muted">Your program data is stored on this device and has not been sent anywhere. Reloading usually fixes this. If it keeps happening, you can reset the saved program.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className={btn('primary')} onClick={() => location.reload()}>Reload</button>
          <button type="button" className={btn('danger')} onClick={() => { try { localStorage.removeItem('kotodin:v1'); } catch { /* blocked */ } location.assign('/program'); }}>Reset saved program</button>
        </div>
      </div>
    );
  }
}
