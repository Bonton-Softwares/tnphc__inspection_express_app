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
 * Resolve relative/stored paths to a fetchable absolute URL.
 * DB-stored values are often relative (e.g. "/uploads/xyz.jpg" or
 * "uploads/xyz.jpg"), which axios cannot fetch directly — they need to be
 * resolved against the app's public base URL.
 *
 * Set APP_BASE_URL (or BASE_URL) in your environment to the host that
 * actually serves /uploads — e.g. the same value used when building
 * progressPhoto/answer URLs in Inspection.usecase.ts:
 *   `${req.protocol}://${req.get("host")}`
 */
function resolveImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.APP_BASE_URL || process.env.BASE_URL || "http://localhost:5000";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

/**
 * Fetch a remote image and return as base64 data URI.
 * Returns null on any error so the PDF can still render (fallback box).
 */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const resolved  = resolveImageUrl(url);
    const response   = await axios.get(resolved, {
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
 * Renders actual images (fetched from URL) into the PDF, laid out in a
 * clean, evenly-spaced grid. Falls back to a labelled box if a fetch fails.
 *
 * NOTE: This is async — callers must await it.
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
  doc.text(label, M, doc.y, { height: 10, lineBreak: false });
  doc.y += 14;

  // Fixed 4-column grid regardless of how many photos are present, so
  // alignment stays consistent across every photo block in the document.
  const gap     = 6;
  const cols    = maxPhotos;
  const imgW    = (usableW - (cols - 1) * gap) / cols;
  const imgH    = imgW * 0.65; // ~3:2 ratio
  const captionH = 10;
  const rowAdvance = imgH + captionH + 8;

  let x   = M;
  let col = 0;

  for (let i = 0; i < urls.length; i++) {
    if (col > 0 && col % cols === 0) {
      x = M;
      doc.y += rowAdvance;
      checkPageBreak(doc, rowAdvance + 20);
    } else {
      checkPageBreak(doc, rowAdvance + 20);
    }

    const currentY = doc.y;
    const dataUri  = await fetchImageAsDataUri(urls[i]);

    if (dataUri) {
      try {
        doc.image(dataUri, x, currentY, { width: imgW, height: imgH, fit: [imgW, imgH] });
      } catch {
        drawFallbackBox(doc, x, currentY, imgW, imgH, urls[i], i + 1);
      }
    } else {
      drawFallbackBox(doc, x, currentY, imgW, imgH, urls[i], i + 1);
    }

    // Photo number caption
    applyFont(doc, 6.5, false, T.colors.subtext);
    doc.text(`Photo ${i + 1}`, x, currentY + imgH + 2, {
      width:     imgW,
      height:    captionH,
      align:     "center",
      lineBreak: false,
    });

    x   += imgW + gap;
    col += 1;
  }

  doc.y += rowAdvance + 4;
}

function drawFallbackBox(
  doc: any,
  x: number, y: number, w: number, h: number,
  url: string, idx: number
) {
  drawRect(doc, x, y, w, h, T.colors.light, T.colors.border);
  applyFont(doc, 6, false, T.colors.muted);
  const filename = url.split("/").pop()?.split("?")[0] ?? url;
  doc.text(`[${idx}] ${filename}`, x + 4, y + h / 2 - 4, {
    width:     w - 8,
    height:    9,
    ellipsis:  true,
    lineBreak: false,
  });
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
  doc.text(`${label} (${urls.length} photo${urls.length > 1 ? "s" : ""})`, M, doc.y, {
    height: 10, lineBreak: false,
  });
  doc.y += 13;

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
    doc.text(`[${i + 1}] ${short}`, x + 3, doc.y + 3, {
      width:     boxW - 6,
      height:    9,
      ellipsis:  true,
      lineBreak: false,
    });

    x += boxW + 4;
  });

  doc.y += boxH + 6;
}