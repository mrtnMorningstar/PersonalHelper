import { addDays, parse, startOfDay } from 'date-fns';

type ParsedCapture = {
  title: string;
  amount?: number;
  dueAt?: string;
  categoryNameHint?: string;
};

function parseAmount(text: string): number | undefined {
  // Supports: $12.34, 12.34, -12.34
  const m = text.match(/(^|\s)(\$?)(-?\d+(?:\.\d{1,2})?)(\s|$)/);
  if (!m) return undefined;
  const n = Number(m[3]);
  return Number.isFinite(n) ? n : undefined;
}

function parseDueAt(text: string, now = new Date()): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes(' today')) return startOfDay(now).toISOString();
  if (lower.includes(' tomorrow')) return startOfDay(addDays(now, 1)).toISOString();

  // "on 2025-12-31" or "on 12/31" (assumes current year)
  const iso = lower.match(/\bon\s+(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {
    const d = parse(iso[1], 'yyyy-MM-dd', now);
    if (!Number.isNaN(d.getTime())) return startOfDay(d).toISOString();
  }

  const us = lower.match(/\bon\s+(\d{1,2})\/(\d{1,2})\b/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const d = new Date(now.getFullYear(), month - 1, day);
    if (!Number.isNaN(d.getTime())) return startOfDay(d).toISOString();
  }

  return undefined;
}

function parseCategoryHint(text: string): string | undefined {
  // "#groceries" or "groceries:" patterns
  const tag = text.match(/#([a-zA-Z][\w-]{1,24})/);
  if (tag) return tag[1];
  const colon = text.match(/\b([a-zA-Z][\w-]{1,24}):\s/);
  if (colon) return colon[1];
  return undefined;
}

export function parseQuickCapture(text: string): ParsedCapture {
  const trimmed = text.trim();
  return {
    title: trimmed,
    amount: parseAmount(trimmed),
    dueAt: parseDueAt(` ${trimmed} `),
    categoryNameHint: parseCategoryHint(trimmed),
  };
}
