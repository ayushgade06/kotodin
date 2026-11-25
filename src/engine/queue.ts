import type { Forecast, Status } from './types';

/** One active filter with its computed forecast — the unit the dashboard, queue and stock work on. */
export interface FilterRow {
  householdId: string;
  code: string;
  members: number;
  c0: number | null;
  pouchCostBDT: number;
  forecast: Forecast;
}

export interface QueueItem {
  row: FilterRow;
  priority: number;
  urgency: number;
  status: Extract<Status, 'failed' | 'overdue' | 'due'>;
  daysOverdue: number; // > 0 when overdue
  daysLeft: number | null; // conservative days left (due)
}

const QUEUE_STATUSES = new Set<Status>(['failed', 'overdue', 'due']);

/** urgency = 3 failed · 2 + min(daysOverdue, 30)/30 overdue · 1 due · 0 otherwise. */
export function urgencyOf(f: Forecast): number {
  if (f.status === 'failed') return 3;
  if (f.status === 'overdue') return 2 + Math.min(-(f.daysLeft?.low ?? 0), 30) / 30;
  if (f.status === 'due') return 1;
  return 0;
}

/** priority = (C0 / 10) × members × urgency; queue = failed/overdue/due sorted by priority desc. */
export function visitQueue(rows: FilterRow[], _today?: string): QueueItem[] {
  return rows
    .filter(r => QUEUE_STATUSES.has(r.forecast.status))
    .map(row => {
      const urgency = urgencyOf(row.forecast);
      const exposure = ((row.c0 ?? 10) / 10) * row.members;
      const low = row.forecast.daysLeft?.low ?? null;
      return {
        row, urgency, priority: exposure * urgency,
        status: row.forecast.status as QueueItem['status'],
        daysOverdue: low != null && low <= 0 ? -low : 0,
        daysLeft: low,
      };
    })
    .sort((a, b) => b.priority - a.priority || a.row.code.localeCompare(b.row.code));
}
