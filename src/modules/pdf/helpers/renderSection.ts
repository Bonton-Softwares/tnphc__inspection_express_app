// src/modules/pdf/helpers/renderSection.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { drawRect, applyFont, drawHRule } from "./pdfStyles";

/**
 * Global flag — set to true during the footer-patch loop so that
 * checkPageBreak becomes a no-op and cannot emit extra blank pages.
 */
let _isPatchingFooters = false;

export function setPatchingFooters(val: boolean) {
  _isPatchingFooters = val;
}

/**
 * Force a page break if remaining space < needed.
 * No-op while footer patching is in progress.
 */
export function checkPageBreak(doc: any, needed = 60) {
  if (_isPatchingFooters) return;          // ← guard: never add pages in patch loop
  const H  = T.page.height;
  const fH = T.spacing.footerHeight + 10;
  if (doc.y + needed > H - fH) {
    doc.addPage();
    doc.y = T.spacing.pageMargin + 10;
  }
}

/**
 * Renders a section heading with a coloured bar/accent.
 *
 * IMPORTANT: every doc.text() call here passes an explicit `height` +
 * `lineBreak: false`. Without these, PDFKit's own auto-pagination can
 * silently insert an extra (often blank) page whenever wrapped text would
 * cross the bottom margin — which conflicts with our manual checkPageBreak
 * system and is the #1 cause of stray blank pages in the output.
 */
export function renderSectionHeading(
  doc: any,
  title: string,
  level: 1 | 2 | 3 = 1
): number {
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  checkPageBreak(doc, 30);

  if (level === 1) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 22, T.colors.primary);
    drawRect(doc, M, y + 22, usableW, 2, T.colors.accent); // gold underline — clear separation
    applyFont(doc, T.fonts.heading + 1, true, T.colors.white);
    doc.text(title.toUpperCase(), M + 8, y + 6, {
      width:     usableW - 16,
      height:    12,
      lineBreak: false,
      ellipsis:  true,
    });
    doc.y = y + 28; // always advance by fixed amount

  } else if (level === 2) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 18, T.colors.light);
    drawRect(doc, M, y, 5, 18, T.colors.secondary); // wider accent bar = more visible
    applyFont(doc, T.fonts.subheading, true, T.colors.primary);
    doc.text(title, M + 12, y + 4, {
      width:     usableW - 16,
      height:    10,
      lineBreak: false,
      ellipsis:  true,
    });
    doc.y = y + 22;

  } else {
    const y = doc.y;
    drawRect(doc, M, y, 3, 12, T.colors.secondary); // small tick for visual anchor
    applyFont(doc, T.fonts.body, true, T.colors.secondary);
    doc.text(title, M + 8, y, {
      width:     usableW - 8,
      height:    10,
      lineBreak: false,
      ellipsis:  true,
    });
    doc.y = y + 12;
    drawHRule(doc, doc.y, T.colors.border, 0.4);
    doc.y += 4;
  }

  return doc.y;
}

/**
 * Insert a blank spacer.
 */
export function spacer(doc: any, px = 8) {
  doc.y += px;
}