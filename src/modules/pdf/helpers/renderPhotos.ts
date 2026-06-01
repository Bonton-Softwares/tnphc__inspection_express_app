// src/modules/pdf/helpers/renderPhotos.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { applyFont, drawRect } from "./pdfStyles";
import { checkPageBreak } from "./renderSection";

/**
 * Renders a row of photo reference boxes.
 * Since photos are stored as JSON (URLs/paths), we show placeholder boxes
 * with the URL truncated — actual images would require fetching.
 */
export function renderPhotoReferences(
  doc: any,
  label: string,
  photos: any
) {
  if (!photos) return;

  let urls: string[] = [];
  if (typeof photos === "string") {
    try { urls = JSON.parse(photos); } catch { urls = [photos]; }
  } else if (Array.isArray(photos)) {
    urls = photos.map(String);
  }

  if (urls.length === 0) return;

  checkPageBreak(doc, 24);
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  applyFont(doc, T.fonts.small, true, T.colors.subtext);
  doc.text(`${label} (${urls.length} photo${urls.length > 1 ? "s" : ""})`, M, doc.y);
  doc.y += 3;

  const boxW = 60;
  const boxH = 14;
  let x      = M;

  urls.slice(0, 6).forEach((url, i) => {
    if (x + boxW > M + usableW) {
      x = M;
      doc.y += boxH + 2;
    }
    checkPageBreak(doc, boxH + 4);

    drawRect(doc, x, doc.y, boxW, boxH, T.colors.light, T.colors.border);
    applyFont(doc, 6, false, T.colors.muted);
    const short = url.split("/").pop() ?? url;
    doc.text(`[${i + 1}] ${short}`, x + 2, doc.y + 3, { width: boxW - 4, ellipsis: true });

    x += boxW + 4;
  });

  doc.y += boxH + 4;
}
