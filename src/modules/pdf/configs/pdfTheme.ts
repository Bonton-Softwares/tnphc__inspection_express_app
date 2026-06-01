// src/modules/pdf/configs/pdfTheme.ts

export const PDF_THEME = {
  colors: {
    primary:    "#1a3c5e",   // deep navy — government header
    secondary:  "#2c6496",   // medium blue
    accent:     "#c8a951",   // gold trim
    light:      "#e8f0f7",   // very light blue for alternating rows
    white:      "#ffffff",
    black:      "#000000",
    text:       "#1a1a1a",
    subtext:    "#4a4a4a",
    border:     "#c0cfe0",
    success:    "#2e7d32",
    warning:    "#f57c00",
    danger:     "#c62828",
    muted:      "#78909c",
  },

  fonts: {
    title:     14,
    heading:   11,
    subheading: 10,
    body:       9,
    small:      8,
    tiny:       7,
  },

  spacing: {
    pageMargin:   40,
    sectionGap:   14,
    rowHeight:    20,
    headerHeight: 80,
    footerHeight: 30,
  },

  page: {
    width:  595.28,   // A4
    height: 841.89,
  },
};
