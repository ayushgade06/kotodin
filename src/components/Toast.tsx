import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Sparkles, TriangleAlert, X } from 'lucide-react';
import { cx } from './ui';

type Tone = 'success' | 'info' | 'warn';
interface ToastItem { id: number; title: string; body?: ReactNode; tone: Tone }
const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems(xs => xs.filter(x => x.id !== id)), []);
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems(xs => [...xs.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.tone === 'info' ? 9000 : 5000);
  }, [dismiss]);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="no-print fixed bottom-4 left-1/2 z-50 flex w-[min(440px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2">
        {items.map(t => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'warn' ? TriangleAlert : Sparkles;
          return (
            <div key={t.id} role="status" className="animate-toast flex items-start gap-3 rounded-xl bg-ink px-4 py-3 text-paper shadow-pop">
              <Icon className={cx('mt-0.5 size-5 shrink-0', t.tone === 'warn' ? 'text-[#F2B8B0]' : t.tone === 'info' ? 'text-[#9FD3E3]' : 'text-[#A8D8B9]')} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{t.title}</div>
                {t.body && <div className="mt-0.5 text-paper/75">{t.body}</div>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded p-1 text-paper/60 hover:text-paper"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
