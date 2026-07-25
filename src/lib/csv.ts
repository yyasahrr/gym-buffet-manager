'use client';

/**
 * Convert an array of flat objects to a CSV string with a UTF-8 BOM so Persian
 * text opens correctly in Excel. Each row is keyed by the provided headers.
 */
export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const head = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(r[c.key])).join(','))
    .join('\n');
  return '﻿' + head + '\n' + body;
}

export function downloadCSV(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
