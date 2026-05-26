import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

import {
  getProgressByProjectService,
  getQualityByProjectService,
  getSuperStructureFullViewService
} from "./superStructureProgress.service";

export const generateSuperStructurePdf = async (
  projectId: string
) => {

  const fullView =
    await getSuperStructureFullViewService(projectId);

  const progressList =
    await getProgressByProjectService(projectId);

  const quality =
    await getQualityByProjectService(projectId);

  const fileName =
    `superstructure-${Date.now()}.pdf`;

  const uploadPath = path.join(
    process.cwd(),
    "uploads",
    fileName
  );

  const doc = new PDFDocument({
    margin: 50,
    size: "A4"
  });

  doc.pipe(
    fs.createWriteStream(uploadPath)
  );

  // ─────────────────────────────────────
  // TITLE
  // ─────────────────────────────────────

  doc
    .fontSize(22)
    .text(
      "SUPERSTRUCTURE REPORT",
      {
        align: "center"
      }
    );

  doc.moveDown(2);

  // ─────────────────────────────────────
  // PROJECT DETAILS
  // ─────────────────────────────────────

  doc
    .fontSize(16)
    .text("PROJECT DETAILS");

  doc.moveDown();

  doc.fontSize(12);

  doc.text(`Project Name: ${fullView.projectName}`);

  doc.text(`Location: ${fullView.location}`);

  doc.text(
    `Has SuperStructure: ${fullView.hasSuperStructure}`
  );

  doc.text(`Total Blocks: ${fullView.totalBlocks}`);

  doc.moveDown(2);

  // ─────────────────────────────────────
  // BLOCK DETAILS
  // ─────────────────────────────────────

  doc
    .fontSize(16)
    .text("BLOCK DETAILS");

  doc.moveDown();

  fullView.blocks.forEach((block: any) => {

    doc.fontSize(13);

    doc.text(`Block Name: ${block.blockName}`);

    doc.text(`Total Floors: ${block.totalFloors}`);

    doc.text(
      `Completed Floors: ${block.completedFloors}`
    );

    doc.text(`Status: ${block.status}`);

    doc.moveDown();
  });

  // ─────────────────────────────────────
  // PROGRESS DETAILS
  // ─────────────────────────────────────

  doc
    .fontSize(16)
    .text("PROGRESS DETAILS");

  doc.moveDown();

  progressList.forEach((progress: any, index: number) => {

    doc
      .fontSize(14)
      .text(`Progress ${index + 1}`);

    doc.fontSize(12);

    doc.text(`Block: ${progress.blockName}`);

    doc.text(`Floor: ${progress.floorName}`);

    doc.text(`Stage: ${progress.stage}`);

    doc.text(`Status: ${progress.status}`);

    doc.text(
      `Created At: ${progress.createdAt}`
    );

    // PHOTOS

    if (
      Array.isArray(progress.photo) &&
      progress.photo.length
    ) {

      doc.text("Photos:");

      progress.photo.forEach((p: any) => {

        doc.text(p.url);
      });
    }

    doc.moveDown();
  });

  // ─────────────────────────────────────
  // QUALITY DETAILS
  // ─────────────────────────────────────

  if (quality) {

    doc
      .fontSize(16)
      .text("QUALITY DETAILS");

    doc.moveDown();

    doc.fontSize(12);

    // ───── BASIC ─────

    doc.text(
      `Work Started Date: ${quality.workStartedDate || "-"}`
    );

    doc.text(`Is Delay: ${quality.isDelay}`);

    doc.text(`Delay Days: ${quality.delayDays}`);

    doc.text(
      `Delay Reason: ${quality.delayReason || "-"}`
    );

    doc.text(
      `General Remarks: ${quality.generalRemarks || "-"}`
    );

    doc.moveDown();

    // ───── CEMENT ─────

    doc
      .fontSize(14)
      .text("CEMENT DETAILS");

    doc.fontSize(12);

    doc.text(
      `Cement Grade Id: ${quality.cementGradeId || "-"}`
    );

    doc.text(
      `Cement Brand Id: ${quality.cementBrandId || "-"}`
    );

    doc.text(
      `Cement Lab Test: ${quality.cementLabTest || "-"}`
    );

    doc.text(
      `Cement Remarks: ${quality.cementRemarks || "-"}`
    );

    doc.moveDown();

    // ───── SAND ─────

    doc
      .fontSize(14)
      .text("SAND DETAILS");

    doc.fontSize(12);

    doc.text(`Sand Type: ${quality.sandType}`);

    doc.text(
      `Sand Lab Test: ${quality.sandLabTest}`
    );

    doc.text(
      `Sand Sieve Test Done: ${quality.sandSieveTestDone}`
    );

    doc.moveDown();

    // ───── STEEL ─────

    doc
      .fontSize(14)
      .text("STEEL DETAILS");

    doc.fontSize(12);

    doc.text(
      `Steel Grade Id: ${quality.steelGradeId}`
    );

    doc.text(
      `Steel Brand Id: ${quality.steelBrandId}`
    );

    doc.text(
      `Steel Lab Test: ${quality.steelLabTest}`
    );

    doc.moveDown();

    // ───── AGGREGATE ─────

    doc
      .fontSize(14)
      .text("AGGREGATE DETAILS");

    doc.fontSize(12);

    doc.text(
      `Aggregate Size: ${quality.aggregateSize}`
    );

    doc.text(
      `Aggregate Lab Test: ${quality.aggregateLabTest}`
    );

    doc.moveDown();

    // ───── WATER ─────

    doc
      .fontSize(14)
      .text("WATER DETAILS");

    doc.fontSize(12);

    doc.text(
      `Water Lab Test: ${quality.waterLabTest}`
    );

    doc.moveDown();

    // ───── CONCRETE ─────

    doc
      .fontSize(14)
      .text("CONCRETE DETAILS");

    doc.fontSize(12);

    doc.text(
      `Concrete Lab Test: ${quality.concreteLabTest}`
    );

    doc.text(
      `Concrete Quality Test Done: ${quality.concreteQualityTestDone}`
    );

    doc.text(
      `Concrete Quality Lab Test: ${quality.concreteQualityLabTest}`
    );

    doc.moveDown();

    // ───── BRICKS ─────

    doc
      .fontSize(14)
      .text("BRICKS DETAILS");

    doc.fontSize(12);

    doc.text(
      `Bricks Lab Test: ${quality.bricksLabTest}`
    );

    doc.text(
      `Bricks Quality Test Done: ${quality.bricksQualityTestDone}`
    );

    doc.text(
      `Bricks Quality Lab Test: ${quality.bricksQualityLabTest}`
    );

    doc.text(
      `Brick Wall Alignment Done: ${quality.brickWallAlignmentDone}`
    );

    doc.text(
      `Brick Wall Alignment Remarks: ${quality.brickWallAlignmentRemarks}`
    );

    doc.moveDown();

    // ───── FINAL REMARKS ─────

    doc
      .fontSize(14)
      .text("FINAL REMARKS");

    doc.fontSize(12);

    doc.text(
      `Quality Remarks: ${quality.qualityRemarks || "-"}`
    );
  }

  doc.end();

  return {
    fileName,
    url: `/uploads/${fileName}`
  };
};