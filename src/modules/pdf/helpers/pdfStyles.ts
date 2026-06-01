// src/modules/pdf/helpers/pdfStyles.ts
import { PDF_THEME as T } from "../configs/pdfTheme";

export function applyFont(
  doc: any,
  size: number,
  bold = false,
  color: string = T.colors.text
) {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color);
}

export function drawHRule(
  doc: any,
  y: number,
  color: string = T.colors.border,
  thickness = 0.5
) {
  const { pageMargin, page } = { pageMargin: T.spacing.pageMargin, page: T.page };
  doc
    .moveTo(pageMargin, y)
    .lineTo(page.width - pageMargin, y)
    .lineWidth(thickness)
    .strokeColor(color)
    .stroke();
}

export function drawRect(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string
) {
  doc.rect(x, y, w, h).fillColor(fill).fill();
  if (stroke) {
    doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(0.5).stroke();
  }
}

export function labelValue(
  doc: any,
  label: string,
  value: string | number | boolean | null | undefined,
  x: number,
  y: number,
  labelW = 160
) {
  const val = value === null || value === undefined ? "—" : String(value);
  applyFont(doc, T.fonts.body, true, T.colors.subtext);
  doc.text(label + ":", x, y, { width: labelW, continued: false });
  applyFont(doc, T.fonts.body, false, T.colors.text);
  doc.text(val, x + labelW, y, { width: 200 });
}
