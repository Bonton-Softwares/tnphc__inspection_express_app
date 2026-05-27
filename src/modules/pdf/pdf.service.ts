import PDFDocument from "pdfkit";
import axios from "axios";

import {
  getProgressByProjectService,
  getQualityByProjectService,
  getSuperStructureFullViewService,
} from "../superStructureProgress/superStructureProgress.service";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 35;
const CONTENT_TOP = HEADER_HEIGHT + 20; // where body starts after header
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 20; // where body ends before footer

const BRAND_BLUE = "#1F3C5B";
const LIGHT_GRAY = "#DADADA";
const TEXT_BLACK = "#1A1A1A";

// ─── MODULE-LEVEL PAGE COUNTER ─────────────────────────────────────────────────
let currentPage = 1;
let doc: PDFKit.PDFDocument;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Reset Y to content start (below header). */
function resetY() {
  doc.y = CONTENT_TOP + 10;
  doc.x = PAGE_MARGIN;
}

/** True when remaining vertical space is less than `needed`. */
function needsNewPage(needed: number): boolean {
  return doc.y + needed > CONTENT_BOTTOM;
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function addHeader() {
  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT).fill(BRAND_BLUE);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("white")
    .text("SUPERSTRUCTURE REPORT", 0, 20, { align: "center", width: PAGE_WIDTH });

  doc.restore();
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function addFooter(pageNum: number) {
  doc.save();

  const lineY = PAGE_HEIGHT - FOOTER_HEIGHT;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, lineY)
    .strokeColor(LIGHT_GRAY)
    .lineWidth(0.5)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("gray")
    .text(`Page ${pageNum}`, 0, lineY + 8, { align: "center", width: PAGE_WIDTH });

  doc.restore();
}

// ─── CREATE PAGE ─────────────────────────────────────────────────────────────
function createPage() {
  if (currentPage > 1) {
    doc.addPage();
  }
  addHeader();
  addFooter(currentPage);
  currentPage++;
  resetY();
}

// ─── CHECK PAGE ──────────────────────────────────────────────────────────────
function checkPage(needed: number = 40) {
  if (needsNewPage(needed)) {
    createPage();
  }
}

// ─── SECTION TITLE ───────────────────────────────────────────────────────────
function sectionTitle(title: string) {
  checkPage(50);

  // small gap above
  if (doc.y > CONTENT_TOP + 10) doc.y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(BRAND_BLUE)
    .text(title.toUpperCase(), PAGE_MARGIN, doc.y);

  const lineY = doc.y + 2;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, lineY)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1)
    .stroke();

  doc.y = lineY + 8;
  doc.x = PAGE_MARGIN;
}

// ─── DETAIL ROW ───────────────────────────────────────────────────────────────
function detailRow(label: string, value: any) {
  checkPage(25);

  const labelX = PAGE_MARGIN;
  const valueX = PAGE_MARGIN + 170;
  const valueWidth = PAGE_WIDTH - PAGE_MARGIN - valueX;
  const rowY = doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(TEXT_BLACK)
    .text(label, labelX, rowY, { width: 160 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(TEXT_BLACK)
    .text(String(value ?? "-"), valueX, rowY, { width: valueWidth });

  // advance Y by max of both rendered heights + small gap
  doc.y += 6;
  doc.x = PAGE_MARGIN;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadgeColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "#27AE60";
    case "IN_PROGRESS":
      return "#F39C12";
    default:
      return "#7F8C8D";
  }
}

// ─── IMAGE GRID ───────────────────────────────────────────────────────────────
async function drawImages(photos: any[]) {
  const validPhotos = (photos || []).filter((p: any) => p?.url);
  if (!validPhotos.length) return;

  const imageWidth = 150;
  const imageHeight = 100;
  const captionHeight = 16;
  const colGap = 12;
  const rowGap = 20;
  const cols = 3;

  // rows needed
  const rows = Math.ceil(validPhotos.length / cols);

  // Check if at least first row fits; if not start new page
  checkPage(imageHeight + captionHeight + rowGap + 10);

  let startX = PAGE_MARGIN;
  let startY = doc.y + 6;

  for (let i = 0; i < validPhotos.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Start a new page when a new row won't fit
    if (col === 0 && i !== 0) {
      if (startY + imageHeight + captionHeight > CONTENT_BOTTOM) {
        createPage();
        startY = doc.y + 6;
      } else {
        startY += imageHeight + captionHeight + rowGap;
      }
    }

    const cellX = startX + col * (imageWidth + colGap);
    const cellY = startY;

    // Card border
    doc
      .roundedRect(cellX, cellY, imageWidth, imageHeight, 4)
      .strokeColor(LIGHT_GRAY)
      .lineWidth(0.5)
      .stroke();

    // Image
    try {
      const response = await axios.get(validPhotos[i].url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      const buffer = Buffer.from(response.data);
      doc.image(buffer, cellX + 4, cellY + 4, {
        fit: [imageWidth - 8, imageHeight - 8],
        align: "center",
        valign: "center",
      });
    } catch {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("red")
        .text("Image unavailable", cellX + 5, cellY + imageHeight / 2 - 4, {
          width: imageWidth - 10,
          align: "center",
        });
    }

    // Caption / filename
    const caption = validPhotos[i].fileName || `Photo ${i + 1}`;
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor("#555555")
      .text(caption, cellX, cellY + imageHeight + 3, {
        width: imageWidth,
        align: "center",
        ellipsis: true,
      });
  }

  // Advance doc.y past the last row
  doc.y = startY + imageHeight + captionHeight + rowGap;
  doc.x = PAGE_MARGIN;
}

// ─── PROGRESS CARD ───────────────────────────────────────────────────────────
async function drawProgressCard(item: any) {
  checkPage(100);

  const cardX = PAGE_MARGIN;
  const cardY = doc.y;
  const cardW = CONTENT_WIDTH;
  const cardH = 80;

  // Card background + border
  doc.roundedRect(cardX, cardY, cardW, cardH, 5).strokeColor(LIGHT_GRAY).lineWidth(0.7).stroke();

  // Left accent stripe
  doc.rect(cardX, cardY, 4, cardH).fill(BRAND_BLUE);

  // Block name
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(BRAND_BLUE)
    .text(`Block : ${item.blockName || "-"}`, cardX + 12, cardY + 10, { width: 200 });

  // Floor
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(TEXT_BLACK)
    .text(`Floor : ${item.floorName || "-"}`, cardX + 12, cardY + 26);

  // Stage
  doc.text(`Stage : ${item.stage || "-"}`, cardX + 12, cardY + 42);

  // Status badge (right side)
  const status = item.status || "NOT_STARTED";
  const badgeColor = statusBadgeColor(status);
  const badgeW = 90;
  const badgeH = 18;
  const badgeX = cardX + cardW - badgeW - 12;
  const badgeY = cardY + 10;

  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 9).fill(badgeColor);
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("white")
    .text(status.replace("_", " "), badgeX, badgeY + 5, { width: badgeW, align: "center" });

  doc.y = cardY + cardH + 10;
  doc.x = PAGE_MARGIN;

  // Photos under card
  const photos = Array.isArray(item.photo) ? item.photo : [];
  if (photos.length > 0) {
    await drawImages(photos);
  }
}

// ─── QUALITY FIELD MAP ────────────────────────────────────────────────────────
const QUALITY_FIELD_LABELS: Record<string, string> = {
  workStartedDate: "Work Started Date",
  isDelay: "Is Delayed?",
  delayDays: "Delay Days",
  delayReason: "Delay Reason",
  delayOtherReason: "Delay Other Reason",
  generalRemarks: "General Remarks",
  cementGradeId: "Cement Grade",
  cementBrandId: "Cement Brand",
  cementRemarks: "Cement Remarks",
  cementLabTest: "Cement Lab Test",
  sandType: "Sand Type",
  sandLabTest: "Sand Lab Test",
  sandSieveTestDone: "Sand Sieve Test Done?",
  sandSieveLabTest: "Sand Sieve Lab Test",
  steelGradeId: "Steel Grade",
  steelBrandId: "Steel Brand",
  steelLabTest: "Steel Lab Test",
  aggregateSize: "Aggregate Size",
  aggregateLabTest: "Aggregate Lab Test",
  waterLabTest: "Water Lab Test",
  concreteLabTest: "Concrete Lab Test",
  concreteQualityTestDone: "Concrete Quality Test Done?",
  concreteQualityLabTest: "Concrete Quality Lab Test",
  bricksLabTest: "Bricks Lab Test",
  bricksQualityTestDone: "Bricks Quality Test Done?",
  bricksQualityLabTest: "Bricks Quality Lab Test",
  brickWallAlignmentDone: "Brick Wall Alignment Done?",
  brickWallAlignmentRemarks: "Brick Wall Alignment Remarks",
  qualityRemarks: "Quality Remarks",
};

const QUALITY_PHOTO_LABELS: Record<string, string> = {
  cementPhoto: "Cement Photos",
  sandPhoto: "Sand Photos",
  sandSievePhoto: "Sand Sieve Photos",
  steelPhoto: "Steel Photos",
  aggregatePhoto: "Aggregate Photos",
  waterPhoto: "Water Photos",
  concretePhoto: "Concrete Photos",
  concreteQualityPhoto: "Concrete Quality Photos",
  bricksPhoto: "Bricks Photos",
  bricksQualityPhoto: "Bricks Quality Photos",
  brickWallAlignmentPhoto: "Brick Wall Alignment Photos",
};

const SKIP_QUALITY_KEYS = new Set(["id", "projectId", "createdAt", "updatedAt", "isActive"]);

// ─── MAIN PDF GENERATOR ───────────────────────────────────────────────────────
export const generateSuperStructurePdf = async (projectId: string): Promise<Buffer> => {
  // Reset state
  currentPage = 1;

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [fullView, progressList, quality] = await Promise.all([
    getSuperStructureFullViewService(projectId),
    getProgressByProjectService(projectId),
    getQualityByProjectService(projectId),
  ]);

  // ── Create doc ──────────────────────────────────────────────────────────────
  doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });

  const buffers: Buffer[] = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────
  doc.addPage();
  addHeader();
  addFooter(currentPage);
  currentPage++;
  resetY();

  // ── PROJECT DETAILS ─────────────────────────────────────────────────────────
  sectionTitle("Project Details");
  detailRow("Project Name", fullView.projectName);
  detailRow("Location", fullView.location || "-");
  detailRow("Has Super Structure", fullView.hasSuperStructure ? "Yes" : "No");
  detailRow("Total Blocks", fullView.totalBlocks ?? 0);

  // ── BLOCK DETAILS ───────────────────────────────────────────────────────────
  if (fullView.blocks?.length) {
    sectionTitle("Block Details");

    for (const block of fullView.blocks) {
      checkPage(60);

      const cardY = doc.y;
      const cardH = 55;

      doc
        .roundedRect(PAGE_MARGIN, cardY, CONTENT_WIDTH, cardH, 5)
        .strokeColor(LIGHT_GRAY)
        .lineWidth(0.5)
        .stroke();

      // Left stripe
      doc.rect(PAGE_MARGIN, cardY, 4, cardH).fill(BRAND_BLUE);

      // Block name (header)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(BRAND_BLUE)
        .text(`Block : ${block.blockName}`, PAGE_MARGIN + 12, cardY + 8, { width: 250 });

      // Details row
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(TEXT_BLACK)
        .text(
          `Total Floors: ${block.totalFloors ?? "-"}   |   Completed: ${block.completedFloors ?? 0}   |   Status: ${block.status}`,
          PAGE_MARGIN + 12,
          cardY + 25,
          { width: CONTENT_WIDTH - 20 }
        );

      doc.y = cardY + cardH + 8;
      doc.x = PAGE_MARGIN;
    }
  }

  // ── PROGRESS DETAILS ────────────────────────────────────────────────────────
  if (progressList?.length) {
    sectionTitle("Progress Details");

    for (const item of progressList) {
      await drawProgressCard(item);
    }
  } else {
    checkPage(30);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("gray")
      .text("No progress records found.", PAGE_MARGIN, doc.y);
    doc.y += 16;
  }

  // ── QUALITY DETAILS ─────────────────────────────────────────────────────────
  if (quality) {
    sectionTitle("Quality Details");

    // Scalar fields
    for (const [key, value] of Object.entries(quality)) {
      if (SKIP_QUALITY_KEYS.has(key)) continue;
      if (Array.isArray(value)) continue;
      if (key in QUALITY_PHOTO_LABELS) continue; // Json photo fields (non-array)

      const label = QUALITY_FIELD_LABELS[key] ?? key;
      let displayValue = value;

      if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
      } else if (value instanceof Date || (typeof value === "string" && key.toLowerCase().includes("date"))) {
        try {
          displayValue = new Date(value as string).toLocaleDateString("en-IN");
        } catch {
          displayValue = value;
        }
      }

      if (displayValue !== null && displayValue !== undefined && displayValue !== "") {
        detailRow(label, displayValue);
      }
    }

    // Photo sections
    for (const [key, label] of Object.entries(QUALITY_PHOTO_LABELS)) {
      const photos = (quality as any)[key];
      const photoArr = Array.isArray(photos) ? photos : photos ? [photos] : [];

      if (photoArr.length > 0) {
        sectionTitle(label);
        await drawImages(photoArr);
      }
    }
  } else {
    checkPage(30);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("gray")
      .text("No quality records found.", PAGE_MARGIN, doc.y);
    doc.y += 16;
  }

  // ── FINALIZE ────────────────────────────────────────────────────────────────
  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
};