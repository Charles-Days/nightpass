export function toCsv(
  rows: Record<string, string | number | null | undefined>[],
  columns: string[],
): string {
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(r[c])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}
