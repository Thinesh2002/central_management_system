function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows = [], columns = []) {
  const header = columns.map((column) => csvCell(column.label)).join(",");

  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const raw = typeof column.value === "function" ? column.value(row) : row[column.key];
        return csvCell(raw);
      })
      .join(",")
  );

  return [header, ...lines].join("\r\n");
}

export function downloadCsv(csvText, filename) {
  const blob = new Blob([`﻿${csvText}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv(rows, columns, filename) {
  downloadCsv(rowsToCsv(rows, columns), filename);
}
