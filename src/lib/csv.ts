/**
 * CSV exports — separate consistent schemas, correct escaping, and
 * spreadsheet-formula protection for user-entered text.
 *
 * Formula guard: cells whose first non-space character is =, +, -, or @
 * get a leading single quote (Excel/Sheets text marker, hidden on display).
 * This prevents pasted CSVs from executing as formulas. Numeric measurement
 * columns are emitted raw (never quoted unless escaping requires it).
 */

export function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^\s*[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [header.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFilename(kind: string, todayISO: string): string {
  const stamp = todayISO.replace(/-/g, '');
  return `liverloop-${kind}-${stamp}.csv`;
}
