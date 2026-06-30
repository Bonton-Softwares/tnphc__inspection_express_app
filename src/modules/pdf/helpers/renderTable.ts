// src/modules/pdf/helpers/renderTable.ts
import { PDF_THEME as T } from "../configs/pdfTheme";
import { applyFont, drawRect } from "./pdfStyles";
import { checkPageBreak } from "./renderSection";

export interface TableColumn {
  header: string;
  key: string;
  width?: number;   // relative weight
}

export function renderTable(
  doc: any,
  columns: TableColumn[],
  rows: Record<string, any>[],
  title?: string
) {
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  // Normalise widths
  const totalWeight = columns.reduce((s, c) => s + (c.width ?? 1), 0);
  const colWidths   = columns.map((c) => ((c.width ?? 1) / totalWeight) * usableW);

  if (title) {
    checkPageBreak(doc, 30);
    applyFont(doc, T.fonts.body, true, T.colors.primary);
    doc.text(title, M, doc.y, { height: 10, lineBreak: false });
    doc.y += 14;
  }

  checkPageBreak(doc, 18 + rows.length * 16);

  // Header row
  let y = doc.y;
  drawRect(doc, M, y, usableW, 18, T.colors.secondary);
  let x = M;
  columns.forEach((col, i) => {
    applyFont(doc, T.fonts.small, true, T.colors.white);
    doc.text(col.header, x + 4, y + 5, {
      width:     colWidths[i] - 6,
      height:    10,
      ellipsis:  true,
      lineBreak: false,
    });
    x += colWidths[i];
  });
  y += 18;
  doc.y = y;

  // Data rows
  rows.forEach((row, ri) => {
    checkPageBreak(doc, 16);
    y = doc.y;
    const bg = ri % 2 === 0 ? T.colors.white : T.colors.light;
    drawRect(doc, M, y, usableW, 16, bg);

    x = M;
    columns.forEach((col, i) => {
      const val = formatCell(row[col.key]);
      applyFont(doc, T.fonts.small, false, T.colors.text);
      doc.text(val, x + 4, y + 4, {
        width:     colWidths[i] - 6,
        height:    9,
        ellipsis:  true,
        lineBreak: false,
      });
      x += colWidths[i];
    });

    // bottom rule
    doc
      .moveTo(M, y + 16)
      .lineTo(M + usableW, y + 16)
      .lineWidth(0.3)
      .strokeColor(T.colors.border)
      .stroke();

    doc.y = y + 16;
  });

  doc.y += 6;
}

function formatCell(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleDateString("en-IN");
  }
  return String(v);
}