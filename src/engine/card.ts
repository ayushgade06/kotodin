import type { ISODate, MediaParams } from './types';
import { isISODate } from './dates';
import { validateMedia } from './presets';

/** Everything the family card needs, encoded in the URL fragment. No names, no locations. */
export interface CardPayload {
  v: 1;
  code: string;
  c0: number;
  lpd: number;
  m: number; // pouch mass g
  p: { qmax: [number, number, number]; b: number; derate: [number, number, number]; fbt: number };
  k: number;
  i: ISODate; // current pouch install date
  lang: 'bn' | 'en';
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

const toB64Url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b + '='.repeat((4 - (b.length % 4)) % 4));
};

export function encodeCard(c: CardPayload): string {
  const compact: CardPayload = {
    ...c,
    k: r3(c.k),
    p: { qmax: c.p.qmax.map(r3) as CardPayload['p']['qmax'], b: r3(c.p.b), derate: c.p.derate.map(r3) as CardPayload['p']['derate'], fbt: r3(c.p.fbt) },
  };
  if (!isValidCard(compact)) throw new RangeError('Card payload out of range');
  return toB64Url(JSON.stringify(compact));
}

export function decodeCard(s: string): CardPayload | null {
  try {
    const obj: unknown = JSON.parse(fromB64Url(s.trim()));
    return isValidCard(obj) ? obj : null;
  } catch {
    return null;
  }
}

const num = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
const tri = (x: unknown): x is [number, number, number] => Array.isArray(x) && x.length === 3 && x.every(v => typeof v === 'number');

export function isValidCard(o: unknown): o is CardPayload {
  if (typeof o !== 'object' || o === null) return false;
  const c = o as Record<string, unknown>;
  const p = c.p as Record<string, unknown> | undefined;
  if (c.v !== 1 || typeof c.code !== 'string' || !/^[A-Za-z0-9-]{1,20}$/.test(c.code)) return false;
  if (!num(c.c0, 0, 3000) || !num(c.lpd, 1, 200) || !num(c.m, 10, 5000) || !num(c.k, 0.05, 10)) return false;
  if (!isISODate(c.i) || (c.lang !== 'bn' && c.lang !== 'en')) return false;
  if (!p || !tri(p.qmax) || !tri(p.derate) || typeof p.b !== 'number' || typeof p.fbt !== 'number') return false;
  try { validateMedia(cardMedia(c as unknown as CardPayload)); } catch { return false; }
  return true;
}

/** Rebuild engine media params from a card payload. */
export function cardMedia(c: CardPayload): MediaParams {
  return { id: 'card', name: 'card', source: 'custom', qmax: c.p.qmax, b: c.p.b, derate: c.p.derate, fBT: c.p.fbt, pouchCostBDT: 0, citations: [] };
}
