// src/modules/pdf/helpers/renderHeader.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { drawRect, applyFont } from "./pdfStyles";

export function renderHeader(
  doc: any,
  title: string,
  subtitle?: string
) {
  const W = T.page.width;
  const M = T.spacing.pageMargin;

  // Top navy bar
  drawRect(doc, 0, 0, W, 72, T.colors.primary);

  // Gold accent line
  drawRect(doc, 0, 72, W, 3, T.colors.accent);

  // Organisation name
  applyFont(doc, 9, false, T.colors.accent);
  doc.text("GOVERNMENT OF TAMIL NADU", M, 12, { align: "center", width: W - M * 2 });

  // Main title
  applyFont(doc, 14, true, T.colors.white);
  doc.text("TNPHC INSPECTION SYSTEM", M, 26, { align: "center", width: W - M * 2 });

  // Report title
  applyFont(doc, 10, false, "#d0e8ff");
  doc.text(title, M, 48, { align: "center", width: W - M * 2 });

  if (subtitle) {
    applyFont(doc, 8, false, "#a0c4e8");
    doc.text(subtitle, M, 62, { align: "center", width: W - M * 2 });
  }

  doc.y = 90;
}

export function renderPageHeader(
  doc: any,
  title: string,
  pageNum: number,
  totalPages: number
) {
  const W = T.page.width;
  const M = T.spacing.pageMargin;

  drawRect(doc, 0, 0, W, 36, T.colors.primary);
  drawRect(doc, 0, 36, W, 2, T.colors.accent);

  applyFont(doc, 9, true, T.colors.white);
  doc.text("TNPHC INSPECTION SYSTEM", M, 10);

  applyFont(doc, 8, false, "#a0c4e8");
  doc.text(title, M, 22);

  applyFont(doc, 8, false, T.colors.white);
  doc.text(`Page ${pageNum} of ${totalPages}`, W - M - 80, 14, { width: 80, align: "right" });

  doc.y = 52;
}
