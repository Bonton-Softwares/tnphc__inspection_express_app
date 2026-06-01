// src/modules/pdf/helpers/renderFields.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { applyFont, drawRect } from "./pdfStyles";
import { checkPageBreak } from "./renderSection";

export interface FieldDef {
  label: string;
  value: string | number | boolean | null | undefined;
}

/**
 * Renders a two-column key/value grid.
 * cols = number of label-value pairs per row (1 or 2).
 */
export function renderFields(
  doc: any,
  fields: FieldDef[],
  cols: 1 | 2 = 2
) {
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;
  const rowH    = 18;
  const labelW  = cols === 2 ? usableW / 2 / 2 : usableW / 2;
  const valW    = cols === 2 ? usableW / 2 / 2 : usableW / 2;
  const colW    = usableW / cols;

  const rows = cols === 2
    ? chunk(fields, 2)
    : fields.map((f) => [f]);

  rows.forEach((row, ri) => {
    checkPageBreak(doc, rowH + 2);
    const y   = doc.y;
    const bg  = ri % 2 === 0 ? T.colors.white : T.colors.light;

    drawRect(doc, M, y, usableW, rowH, bg);

    row.forEach((field, ci) => {
      const x    = M + ci * colW;
      const val  = formatValue(field.value);

      // border between label and value
      doc
        .moveTo(x + labelW, y)
        .lineTo(x + labelW, y + rowH)
        .lineWidth(0.3)
        .strokeColor(T.colors.border)
        .stroke();

      // label
      applyFont(doc, T.fonts.small, true, T.colors.subtext);
      doc.text(field.label, x + 4, y + 5, { width: labelW - 6, ellipsis: true });

      // value
      applyFont(doc, T.fonts.small, false, T.colors.text);
      doc.text(val, x + labelW + 4, y + 5, { width: valW - 6, ellipsis: true });
    });

    // bottom border
    doc
      .moveTo(M, y + rowH)
      .lineTo(M + usableW, y + rowH)
      .lineWidth(0.3)
      .strokeColor(T.colors.border)
      .stroke();

    doc.y = y + rowH;
  });

  doc.y += 4;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v instanceof Date) return v.toLocaleDateString("en-IN");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleDateString("en-IN");
  }
  return String(v);
}
