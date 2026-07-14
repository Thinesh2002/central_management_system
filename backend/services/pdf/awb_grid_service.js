const { PDFDocument } = require("pdf-lib");

// Daraz's own /order/package/document/get lays labels out however its
// template wants (observed: 6 per page), not the 3x3 grid the user asked
// for - so "A4 Print" mode fetches one clean single-label PDF per package
// and imposes them onto our own grid instead of trusting Daraz's layout.
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const MARGIN = 20;
const GAP = 10;

async function composeAwbGridPdf(labelPdfBuffers) {
  const composite = await PDFDocument.create();
  const perPage = GRID_COLS * GRID_ROWS;
  const cellWidth = (A4_WIDTH - MARGIN * 2 - GAP * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = (A4_HEIGHT - MARGIN * 2 - GAP * (GRID_ROWS - 1)) / GRID_ROWS;

  for (let pageStart = 0; pageStart < labelPdfBuffers.length; pageStart += perPage) {
    const chunk = labelPdfBuffers.slice(pageStart, pageStart + perPage);
    const page = composite.addPage([A4_WIDTH, A4_HEIGHT]);

    for (let slot = 0; slot < chunk.length; slot++) {
      const [embeddedPage] = await composite.embedPdf(chunk[slot], [0]);
      const col = slot % GRID_COLS;
      const row = Math.floor(slot / GRID_COLS);

      const scale = Math.min(cellWidth / embeddedPage.width, cellHeight / embeddedPage.height);
      const drawWidth = embeddedPage.width * scale;
      const drawHeight = embeddedPage.height * scale;

      const cellTopY = A4_HEIGHT - MARGIN - row * (cellHeight + GAP);
      const cellBottomY = cellTopY - cellHeight;
      const cellLeftX = MARGIN + col * (cellWidth + GAP);

      page.drawPage(embeddedPage, {
        x: cellLeftX + (cellWidth - drawWidth) / 2,
        y: cellBottomY + (cellHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  return Buffer.from(await composite.save());
}

module.exports = { composeAwbGridPdf };
