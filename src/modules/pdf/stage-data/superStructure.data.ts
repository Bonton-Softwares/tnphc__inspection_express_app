// src/modules/pdf/stage-data/superStructure.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderTable }                   from "../helpers/renderTable";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderSuperStructureData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Superstructure Stage", 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Total Blocks",     value: stageData.totalBlocks },
    { label: "Total Floors",     value: stageData.totalFloors },
    { label: "Completed Floors", value: stageData.completedFloors },
    { label: "Quality Checked",  value: stageData.qualityChecked },
  ]);

  // Per-block summary table
  if (stageData.blocks?.length) {
    renderTable(doc, [
      { header: "Block",            key: "blockName",      width: 1.5 },
      { header: "Total Floors",     key: "totalFloors",    width: 1 },
      { header: "Started",          key: "startedFloors",  width: 1 },
      { header: "Completed",        key: "completedFloors", width: 1 },
      { header: "Status",           key: "status",         width: 1.5 },
    ], stageData.blocks, "Block-wise Summary");

    // Per-block floor details
    stageData.blocks.forEach((block: any) => {
      if (!block.floorDetails?.length) return;
      renderSectionHeading(doc, `Block: ${block.blockName}`, 2);
      renderTable(doc, [
        { header: "Floor",   key: "floorName", width: 2 },
        { header: "Status",  key: "status",    width: 1.5 },
      ], block.floorDetails, undefined);
    });
  }

  // Quality record
  if (stageData.qualityRecord) {
    const q = stageData.qualityRecord;
    renderSectionHeading(doc, "Quality Check", 2);
    renderFields(doc, [
      { label: "Work Started",        value: q.workStartedDate },
      { label: "Is Delayed",          value: q.isDelay },
      { label: "Delay Days",          value: q.delayDays },
      { label: "Delay Reason",        value: q.delayReason },
      { label: "General Remarks",     value: q.generalRemarks },
      { label: "Cement Grade",        value: q.cementGradeId },
      { label: "Cement Brand",        value: q.cementBrandId },
      { label: "Sand Type",           value: q.sandType },
      { label: "Steel Grade",         value: q.steelGradeId },
      { label: "Steel Brand",         value: q.steelBrandId },
      { label: "Aggregate Size (mm)", value: q.aggregateSize },
      { label: "Concrete Lab Test",   value: q.concreteLabTest },
      { label: "Bricks Lab Test",     value: q.bricksLabTest },
      { label: "Brick Wall Alignment",value: q.brickWallAlignmentDone },
      { label: "Quality Remarks",     value: q.qualityRemarks },
    ]);
    renderPhotoReferences(doc, "Cement Photos",    q.cementPhoto);
    renderPhotoReferences(doc, "Steel Photos",     q.steelPhoto);
    renderPhotoReferences(doc, "Concrete Photos",  q.concretePhoto);
    renderPhotoReferences(doc, "Alignment Photos", q.brickWallAlignmentPhoto);
  }

  spacer(doc, 8);
}
