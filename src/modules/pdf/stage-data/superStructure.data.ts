// src/modules/pdf/stage-data/superStructure.data.ts
import { renderSectionHeading, spacer, checkPageBreak } from "../helpers/renderSection";
import { renderFields }         from "../helpers/renderFields";
import { renderTable }          from "../helpers/renderTable";
import { renderPhotoImages }    from "../helpers/renderPhotos";

export async function renderSuperStructureData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Superstructure Stage", 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Total Blocks",     value: stageData.totalBlocks },
    { label: "Total Floors",     value: stageData.totalFloors },
    { label: "Completed Floors", value: stageData.completedFloors },
    { label: "Quality Checked",  value: stageData.qualityChecked },
  ]);

  if (!stageData.blocks?.length) return;

  // ── Per-block breakdown ──────────────────────────────────────────────────────
  for (const block of stageData.blocks) {
    checkPageBreak(doc, 40);
    renderSectionHeading(doc, `Block: ${block.blockName}`, 2);

    renderFields(doc, [
      { label: "Total Floors",     value: block.totalFloors },
      { label: "Started Floors",   value: block.startedFloors },
      { label: "Completed Floors", value: block.completedFloors },
      { label: "Status",           value: block.status },
    ]);

    // Floor-level progress table
    if (block.floorDetails?.length) {
      renderTable(doc, [
        { header: "Floor",   key: "floorName", width: 1.5 },
        { header: "Stage",   key: "stage",     width: 2 },
        { header: "Status",  key: "status",    width: 1.5 },
        { header: "Remarks", key: "remarks",   width: 2 },
      ], block.floorDetails);
    }

    // Per-block quality
    if (block.qualityRecord) {
      const q = block.qualityRecord;
      renderSectionHeading(doc, `Block ${block.blockName} — Quality Check`, 3);

      renderFields(doc, [
        { label: "Work Started",        value: q.workStartedDate },
        { label: "Is Delayed",          value: q.isDelay },
        { label: "Delay Days",          value: q.delayDays },
        { label: "Delay Reason",        value: q.delayReason },
        { label: "General Remarks",     value: q.generalRemarks },
        { label: "Cement Grade",        value: q.cementGrade  ?? q.cementGradeId },
        { label: "Cement Brand",        value: q.cementBrand  ?? q.cementBrandId },
        { label: "Cement Remarks",      value: q.cementRemarks },
        { label: "Cement Lab Test",     value: q.cementLabTest },
        { label: "Sand Type",           value: q.sandType },
        { label: "Sand Lab Test",       value: q.sandLabTest },
        { label: "Sieve Test Done",     value: q.sandSieveTestDone },
        { label: "Sieve Lab Test",      value: q.sandSieveLabTest },
        { label: "Steel Grade",         value: q.steelGrade  ?? q.steelGradeId },
        { label: "Steel Brand",         value: q.steelBrand  ?? q.steelBrandId },
        { label: "Steel Lab Test",      value: q.steelLabTest },
        { label: "Aggregate Size (mm)", value: q.aggregateSize },
        { label: "Aggregate Lab Test",  value: q.aggregateLabTest },
        { label: "Water Lab Test",      value: q.waterLabTest },
        { label: "Concrete Lab Test",   value: q.concreteLabTest },
        { label: "Concrete Quality",    value: q.concreteQualityTestDone },
        { label: "Bricks Lab Test",     value: q.bricksLabTest },
        { label: "Bricks Quality",      value: q.bricksQualityTestDone },
        { label: "Brick Wall Alignment",value: q.brickWallAlignmentDone },
        { label: "Alignment Remarks",   value: q.brickWallAlignmentRemarks },
        { label: "Quality Remarks",     value: q.qualityRemarks },
      ]);

      await renderPhotoImages(doc, "Cement Photos",    q.cementPhoto);
      await renderPhotoImages(doc, "Sand Photos",      q.sandPhoto);
      await renderPhotoImages(doc, "Steel Photos",     q.steelPhoto);
      await renderPhotoImages(doc, "Aggregate Photos", q.aggregatePhoto);
      await renderPhotoImages(doc, "Concrete Photos",  q.concretePhoto);
      await renderPhotoImages(doc, "Bricks Photos",    q.bricksPhoto);
      await renderPhotoImages(doc, "Alignment Photos", q.brickWallAlignmentPhoto);
    }

    spacer(doc, 6);
  }
}
