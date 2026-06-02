// src/modules/pdf/helpers/renderPhotos.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { applyFont, drawRect } from "./pdfStyles";
import { checkPageBreak } from "./renderSection";
import axios from "axios";

/**
 * Extract URLs from any photo field shape:
 *  - null / undefined           → []
 *  - string (JSON array)        → parsed
 *  - string (plain URL)         → [string]
 *  - object { url, path, ...}   → [obj.url ?? obj.path ?? obj.fileUrl]
 *  - Array of the above         → flattened
 */
function extractUrls(photos: any): string[] {
  if (!photos) return [];

  // Already a plain string
  if (typeof photos === "string") {
    const trimmed = photos.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractUrls(parsed);
      } catch {
        return trimmed ? [trimmed] : [];
      }
    }
    return trimmed ? [trimmed] : [];
  }

  // Array — recurse each item
  if (Array.isArray(photos)) {
    return photos.flatMap(extractUrls).filter(Boolean);
  }

  // Object — pick the URL field
  if (typeof photos === "object") {
    const url =
      photos.url       ??
      photos.fileUrl   ??
      photos.path      ??
      photos.filePath  ??
      photos.imageUrl  ??
      photos.link      ??
      null;
    return url ? [String(url)] : [];
  }

  return [];
}

/**
 * Fetch a remote image and return as base64 data URI.
 * Returns null on any error so the PDF can still render.
 */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout:      8000,
      headers:      { Accept: "image/*" },
    });
    const mime   = (response.headers["content-type"] as string) || "image/jpeg";
    const base64 = Buffer.from(response.data).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Renders actual images (fetched from URL) into the PDF.
 * Falls back to a URL label box if fetch fails.
 *
 * NOTE: This is async — callers must await it.
 * For sync renderers, use renderPhotoReferencesSync instead.
 */
export async function renderPhotoImages(
  doc: any,
  label: string,
  photos: any,
  maxPhotos = 4
): Promise<void> {
  const urls = extractUrls(photos).slice(0, maxPhotos);
  if (urls.length === 0) return;

  checkPageBreak(doc, 30);
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  applyFont(doc, T.fonts.small, true, T.colors.subtext);
  doc.text(label, M, doc.y);
  doc.y += 4;

  const imgW    = (usableW - (maxPhotos - 1) * 6) / maxPhotos;  // max 4 across
  const imgH    = imgW * 0.65;                                   // ~3:2 ratio
  const perRow  = Math.floor(usableW / (imgW + 6));

  let x   = M;
  let col = 0;

  for (let i = 0; i < urls.length; i++) {
    if (col > 0 && col % perRow === 0) {
      x = M;
      doc.y += imgH + 6;
      checkPageBreak(doc, imgH + 20);
    }

    checkPageBreak(doc, imgH + 20);
    const currentY = doc.y;

    const dataUri = await fetchImageAsDataUri(urls[i]);

    if (dataUri) {
      try {
        doc.image(dataUri, x, currentY, { width: imgW, height: imgH });
      } catch {
        // Image decode failed — draw fallback box
        drawFallbackBox(doc, x, currentY, imgW, imgH, urls[i], i + 1);
      }
    } else {
      drawFallbackBox(doc, x, currentY, imgW, imgH, urls[i], i + 1);
    }

    // Photo number caption
    applyFont(doc, 6.5, false, T.colors.subtext);
    doc.text(`Photo ${i + 1}`, x, currentY + imgH + 1, { width: imgW, align: "center" });

    x   += imgW + 6;
    col += 1;
  }

  doc.y += imgH + 18;
}

function drawFallbackBox(
  doc: any,
  x: number, y: number, w: number, h: number,
  url: string, idx: number
) {
  drawRect(doc, x, y, w, h, T.colors.light, T.colors.border);
  applyFont(doc, 6, false, T.colors.muted);
  const filename = url.split("/").pop()?.split("?")[0] ?? url;
  doc.text(`[${idx}] ${filename}`, x + 4, y + h / 2 - 4, { width: w - 8, ellipsis: true });
}

/**
 * Sync version — just shows URL label boxes (no fetch).
 * Use this for stages where you don't need actual images.
 */
export function renderPhotoReferences(
  doc: any,
  label: string,
  photos: any
) {
  const urls = extractUrls(photos);
  if (urls.length === 0) return;

  checkPageBreak(doc, 24);
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  applyFont(doc, T.fonts.small, true, T.colors.subtext);
  doc.text(`${label} (${urls.length} photo${urls.length > 1 ? "s" : ""})`, M, doc.y);
  doc.y += 3;

  const boxW = Math.min(130, (usableW - 12) / 4);
  const boxH = 14;
  let x = M;

  urls.slice(0, 8).forEach((url, i) => {
    if (x + boxW > M + usableW) {
      x = M;
      doc.y += boxH + 2;
    }
    checkPageBreak(doc, boxH + 4);

    drawRect(doc, x, doc.y, boxW, boxH, T.colors.light, T.colors.border);
    applyFont(doc, 6, false, T.colors.muted);
    const short = url.split("/").pop()?.split("?")[0] ?? url;
    doc.text(`[${i + 1}] ${short}`, x + 3, doc.y + 3, { width: boxW - 6, ellipsis: true });

    x += boxW + 4;
  });

  doc.y += boxH + 6;
}
