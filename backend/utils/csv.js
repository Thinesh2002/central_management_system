function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const normalized = raw.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (/[",\n]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
  return normalized;
}

function rowsToCsv(rows = [], columns = null) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const keys = columns && columns.length
    ? columns
    : Array.from(safeRows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set()));

  const header = keys.map(csvEscape).join(',');
  const body = safeRows.map((row) => keys.map((key) => csvEscape(row?.[key])).join(',')).join('\n');
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function sendCsv(res, filename, rows = [], columns = null) {
  const safeName = String(filename || 'export.csv').replace(/[^a-z0-9_.-]+/gi, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  return res.send(rowsToCsv(rows, columns));
}

module.exports = { csvEscape, rowsToCsv, sendCsv };
