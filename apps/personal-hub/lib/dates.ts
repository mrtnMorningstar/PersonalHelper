import { addDays, endOfDay, format, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDayBounds(iso: string): { start: Date; end: Date } {
  const d = parseISO(iso);
  return { start: startOfDay(d), end: endOfDay(d) };
}

export function isDueToday(dueAtIso?: string, reference = new Date()): boolean {
  if (!dueAtIso) return false;
  return isSameDay(parseISO(dueAtIso), reference);
}

export function isOverdue(dueAtIso?: string, reference = new Date()): boolean {
  if (!dueAtIso) return false;
  return isBefore(parseISO(dueAtIso), startOfDay(reference));
}

export function isUpcomingWithinDays(dueAtIso: string, days: number, reference = new Date()): boolean {
  const due = parseISO(dueAtIso);
  const start = startOfDay(reference);
  const end = endOfDay(addDays(reference, days));
  return (isAfter(due, start) || isSameDay(due, start)) && (isBefore(due, end) || isSameDay(due, end));
}

export function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}
