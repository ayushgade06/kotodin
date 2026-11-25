import { useState } from 'react';
import { FE_RHA_LITERATURE, makeCustomPreset, type MediaParams } from '../engine';
import { Field, inputCls } from './ui';

type Draft = Record<'q0' | 'q1' | 'q2' | 'b' | 'd0' | 'd1' | 'd2' | 'fbt' | 'cost', string>;
export const toDraft = (m: MediaParams): Draft => ({
  q0: String(m.qmax[0]), q1: String(m.qmax[1]), q2: String(m.qmax[2]), b: String(m.b),
  d0: String(m.derate[0]), d1: String(m.derate[1]), d2: String(m.derate[2]), fbt: String(m.fBT), cost: String(m.pouchCostBDT),
});

/** Parse a draft into custom media, or return a human-readable error. */
export function draftToMedia(d: Draft): { media: MediaParams | null; error: string | null } {
  const n = (s: string) => (s.trim() === '' ? NaN : Number(s));
  try {
    const media = makeCustomPreset({
      qmax: [n(d.q0), n(d.q1), n(d.q2)], b: n(d.b), derate: [n(d.d0), n(d.d1), n(d.d2)], fBT: n(d.fbt), pouchCostBDT: n(d.cost),
    });
    return { media, error: null };
  } catch (e) {
    return { media: null, error: e instanceof Error ? e.message : 'Invalid values' };
  }
}

/** Editable isotherm / derating parameters, for plugging in a lab's own measurements. */
export function MediaEditor({ draft, onChange, idPrefix }: { draft: Draft; onChange: (d: Draft) => void; idPrefix: string }) {
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [k]: e.target.value });
  const num = (k: keyof Draft, label: string, step = 'any') => (
    <Field label={label} htmlFor={`${idPrefix}-${k}`}>
      <input id={`${idPrefix}-${k}`} type="number" inputMode="decimal" step={step} value={draft[k]} onChange={set(k)} className={inputCls()} />
    </Field>
  );
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold">Langmuir q<sub>max</sub> (mg As per g media)</legend>
        <div className="grid grid-cols-3 gap-2">{num('q0', 'Low')}{num('q1', 'Mid')}{num('q2', 'High')}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold">Field derating (competing ions, pH, channelling)</legend>
        <div className="grid grid-cols-3 gap-2">{num('d0', 'Low')}{num('d1', 'Mid')}{num('d2', 'High')}</div>
      </fieldset>
      <div className="grid grid-cols-3 gap-2">
        {num('b', 'b (L/mg)')}
        {num('fbt', 'Usable fraction fBT')}
        {num('cost', 'Pouch cost (৳)', '1')}
      </div>
    </div>
  );
}

export function useMediaDraft(initial: MediaParams = FE_RHA_LITERATURE) {
  return useState<Draft>(() => toDraft(initial));
}
export type { Draft };
