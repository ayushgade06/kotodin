import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Printer } from 'lucide-react';
import { encodeCard } from '../engine';
import { useProgram } from '../state/ProgramContext';
import { formatDate, translate } from '../i18n';
import { Wordmark } from '../components/AppShell';
import { Button } from '../components/ui';
import { ProgramGate } from './Program';

export default function Stickers() {
  return <ProgramGate><Sheet /></ProgramGate>;
}

interface Sticker { id: string; code: string; url: string; replaceBy: string | null; svg?: string }

function Sheet() {
  const [params] = useSearchParams();
  const p = useProgram();
  const d = p.derived!;
  const idsKey = params.get('ids') ?? '';
  const ids = useMemo(() => idsKey.split(',').filter(Boolean), [idsKey]);
  const base = useMemo<Sticker[]>(() => ids
    .map(id => d.byHousehold.get(id))
    .filter(r => r != null && r.household.influentAsUgL != null && r.forecast.status !== 'not_needed')
    .map(r => ({
      id: r!.householdId, code: r!.code, replaceBy: r!.forecast.replaceBy,
      url: `${location.origin}/card#${encodeCard({ v: 1, code: r!.code, c0: r!.household.influentAsUgL!, lpd: r!.household.litresPerDay, m: r!.filter.pouchMassG, p: { qmax: d.media.qmax, b: d.media.b, derate: d.media.derate, fbt: d.media.fBT }, k: d.calibration.k, i: r!.pouch.installedOn, lang: 'bn' })}`,
    })), [ids, d]);
  const [stickers, setStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all(base.map(async s => ({ ...s, svg: await QRCode.toString(s.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#0F1B24', light: '#FFFFFF' } }) })))
      .then(xs => { if (live) setStickers(xs); });
    return () => { live = false; };
  }, [base]);
  useEffect(() => { document.title = `Kotodin stickers (${base.length})`; }, [base.length]);

  const skipped = ids.length - base.length;
  const pages: Sticker[][] = [];
  for (let i = 0; i < stickers.length; i += 8) pages.push(stickers.slice(i, i + 8));

  return (
    <div className="min-h-dvh bg-paper-2 print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/program" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden />Program</Link>
          <div className="text-sm text-ink-2">{base.length} sticker{base.length === 1 ? '' : 's'} · A4, 8 per page{skipped > 0 && <span className="text-muted"> · {skipped} skipped (no forecast)</span>}</div>
          <Button variant="primary" onClick={() => print()} disabled={!stickers.length}><Printer className="size-4" aria-hidden />Print</Button>
        </div>
      </div>
      {base.length === 0 && <p className="no-print mx-auto max-w-md px-4 py-16 text-center text-muted">No printable households selected. Stickers need a household with a well arsenic value above 10 µg/L.</p>}
      {pages.map((pg, i) => (
        <section key={i} className="mx-auto my-6 grid h-[277mm] w-[190mm] grid-cols-2 grid-rows-4 gap-[4mm] bg-white p-[4mm] shadow-pop print:my-0 print:shadow-none print:[break-after:page]" aria-label={`Sticker page ${i + 1}`}>
          {pg.map(s => (
            <article key={s.id} className="flex items-center gap-[4mm] rounded-[3mm] border border-dashed border-line-strong p-[4mm] [break-inside:avoid]">
              <div className="w-[36mm] shrink-0 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: s.svg ?? '' }} role="img" aria-label={`QR code for ${s.code}`} />
              <div className="flex min-w-0 flex-1 flex-col self-stretch justify-between">
                <Wordmark className="scale-90 origin-left" />
                <div>
                  <div className="text-[22pt] font-bold leading-none tnum">{s.code}</div>
                  {s.replaceBy && <div className="mt-[1.5mm] text-[9pt] text-ink-2"><span lang="bn">{translate('bn', 'sticker.replaceBy')}</span>: <strong lang="bn" className="font-bn">{formatDate(s.replaceBy, 'bn', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>}
                </div>
                <p lang="bn" className="font-bn text-[9.5pt] leading-snug">{translate('bn', 'sticker.scan')}</p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
