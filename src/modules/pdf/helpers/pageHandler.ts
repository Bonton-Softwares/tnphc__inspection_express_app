// src/modules/pdf/helpers/pageHandler.ts
import PDFDocument from "pdfkit";
import { renderFooter } from "./renderFooter";

/**
 * Creates a PDFDocument with auto page-number footers.
 * Usage:
 *   const { doc, getPageCount } = createDoc("Report Title", "Subtitle");
 */
export function createDoc(reportTitle: string, generatedBy?: string) {
  const doc = new PDFDocument({
    size:    "A4",
    margins: { top: 10, bottom: 40, left: 40, right: 40 },
    autoFirstPage: true,
    bufferPages: true,    // ← lets us write footers after all pages are done
  });

  // We'll patch footers at the end via finalize()
  return {
    doc,
    finalize: (totalPages?: number) => {
      const range  = doc.bufferedPageRange();
      const total  = totalPages ?? range.count;

      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        renderFooter(doc, i + 1, total, generatedBy);
      }
      doc.end();
    },
  };
}
