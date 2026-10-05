export function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function serializeCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
