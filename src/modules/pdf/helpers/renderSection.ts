// src/modules/pdf/helpers/renderSection.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { drawRect, applyFont, drawHRule } from "./pdfStyles";

/**
 * Renders a bold section heading with a coloured bar.
 * Returns the new Y position after the heading.
 */
export function renderSectionHeading(
  doc: any,
  title: string,
  level: 1 | 2 | 3 = 1
): number {
  const M   = T.spacing.pageMargin;
  const W   = T.page.width;
  const usableW = W - M * 2;

  checkPageBreak(doc, 28);

  if (level === 1) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 20, T.colors.primary);
    applyFont(doc, T.fonts.heading, true, T.colors.white);
    doc.text(title.toUpperCase(), M + 8, y + 5, { width: usableW - 16 });
    doc.y = y + 24;

  } else if (level === 2) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 18, T.colors.light);
    // left accent bar
    drawRect(doc, M, y, 4, 18, T.colors.secondary);
    applyFont(doc, T.fonts.subheading, true, T.colors.primary);
    doc.text(title, M + 10, y + 4, { width: usableW - 14 });
    doc.y = y + 22;

  } else {
    const y = doc.y;
    applyFont(doc, T.fonts.body, true, T.colors.secondary);
    doc.text(title, M, y);
    doc.y += 2;
    drawHRule(doc, doc.y, T.colors.border, 0.4);
    doc.y += 4;
  }

  return doc.y;
}

/**
 * Insert a blank spacer (avoids doc.moveDown ambiguity).
 */
export function spacer(doc: any, px = 8) {
  doc.y += px;
}

/**
 * Force a page break if remaining space < needed.
 */
export function checkPageBreak(doc: any, needed = 60) {
  const H  = T.page.height;
  const fH = T.spacing.footerHeight + 10;
  if (doc.y + needed > H - fH) {
    doc.addPage();
    doc.y = T.spacing.pageMargin + 10;
  }
}
