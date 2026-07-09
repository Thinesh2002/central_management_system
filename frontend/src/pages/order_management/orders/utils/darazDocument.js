function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return null;

  for (const key of keys) {
    if (obj[key]) return obj[key];
  }

  return null;
}

// Browsers block window.open() calls that happen after an `await` unless
// they're a direct, synchronous result of the click handler. Open a blank
// tab immediately (before the API call) and populate it once the result
// comes back — this is what keeps "Print AWB" from getting silently blocked.
export function openBlankPrintWindow(message = "Preparing document...") {
  const printWindow = window.open("", "_blank");
  writePrintWindowMessage(printWindow, message);
  return printWindow;
}

export function writePrintWindowMessage(printWindow, message) {
  if (!printWindow || printWindow.closed) return;

  try {
    printWindow.document.write(
      `<html><head><title>Daraz Document</title></head>` +
        `<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;` +
        `height:100vh;margin:0;background:#0b1220;color:#e2e8f0;font-size:13px;">` +
        `<p>${message}</p></body></html>`
    );
    printWindow.document.close();
  } catch {
    // window may already be navigating away — nothing to do
  }
}

export function closePrintWindow(printWindow) {
  if (printWindow && !printWindow.closed) {
    try {
      printWindow.close();
    } catch {
      // ignore
    }
  }
}

function extractPdfUrl(result) {
  return pick(result?.data || {}, ["pdf_url", "pdfUrl", "file_url", "document_url", "url"]);
}

export function openDarazDocument(result, printWindow) {
  const pdfUrl = extractPdfUrl(result);
  if (!pdfUrl) return false;

  if (printWindow && !printWindow.closed) {
    printWindow.location.href = pdfUrl;
  } else {
    window.open(pdfUrl, "_blank");
  }

  return true;
}

export function extractDarazActionMessage(result) {
  const data = result?.data || {};
  const errors = data.errors || [];
  const skipped = data.skipped || [];

  if (!errors.length && !skipped.length) return result?.message || "";

  const lines = [result?.message || ""];

  if (errors.length) lines.push(...errors.map((e) => `Order ${e.order_id}: ${e.reason}`));
  if (skipped.length) lines.push(...skipped.map((s) => `Order ${s.order_id}: skipped — ${s.reason || "not eligible"}`));

  return lines.filter(Boolean).join("\n");
}
