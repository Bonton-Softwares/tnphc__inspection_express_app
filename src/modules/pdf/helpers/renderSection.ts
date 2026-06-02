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
 * Renders a bold section heading with a coloured bar.
 * Uses explicit y coordinates + lineBreak:false so the cursor
 * is advanced only by the fixed heading height, never by text reflow.
 */
export function renderSectionHeading(
  doc: any,
  title: string,
  level: 1 | 2 | 3 = 1
): number {
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  checkPageBreak(doc, 28);

  if (level === 1) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 20, T.colors.primary);
    applyFont(doc, T.fonts.heading, true, T.colors.white);
    doc.text(title.toUpperCase(), M + 8, y + 5, {
      width:     usableW - 16,
      lineBreak: false,        // ← prevent text reflow pushing doc.y
      ellipsis:  true,
    });
    doc.y = y + 24;            // ← always advance by fixed amount

  } else if (level === 2) {
    const y = doc.y;
    drawRect(doc, M, y, usableW, 18, T.colors.light);
    drawRect(doc, M, y, 4, 18, T.colors.secondary);
    applyFont(doc, T.fonts.subheading, true, T.colors.primary);
    doc.text(title, M + 10, y + 4, {
      width:     usableW - 14,
      lineBreak: false,
      ellipsis:  true,
    });
    doc.y = y + 22;

  } else {
    const y = doc.y;
    applyFont(doc, T.fonts.body, true, T.colors.secondary);
    doc.text(title, M, y, {
      width:     usableW,
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