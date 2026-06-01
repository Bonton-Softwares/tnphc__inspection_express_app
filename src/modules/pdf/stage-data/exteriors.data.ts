// src/modules/pdf/stage-data/exteriors.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderTable }                   from "../helpers/renderTable";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderExteriorsData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Exteriors", 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Total Blocks",    value: stageData.totalBlocks },
    { label: "Quality Checked", value: stageData.qualityChecked },
  ]);

  if (stageData.blocks?.length) {
    renderTable(doc, [
      { header: "Block",     key: "blockName",      width: 1.5 },
      { header: "Total",     key: "totalFloors",    width: 1 },
      { header: "Started",   key: "startedFloors",  width: 1 },
      { header: "Completed", key: "completedFloors", width: 1 },
      { header: "Status",    key: "status",         width: 1.5 },
    ], stageData.blocks, "Block-wise Summary");
  }

  if (stageData.qualityRecord) {
    const q = stageData.qualityRecord;
    renderSectionHeading(doc, "Exterior Quality", 2);
    renderFields(doc, [
      { label: "Work Started",            value: q.workStartedDate },
      { label: "Is Delayed",              value: q.isDelayed },
      { label: "Delay Days",              value: q.delayDays },
      { label: "General Remarks",         value: q.generalRemarks },
      { label: "Cement Grade",            value: q.cementGradeId },
      { label: "Sand Type",               value: q.sandType },
      { label: "Plastering Done",         value: q.plasteringTestDone },
      { label: "Plastering Remarks",      value: q.plasteringRemarks },
      { label: "Door/Window Type",        value: q.doorWindowType },
      { label: "UPVC Brand",              value: q.upvcBrand },
      { label: "Glass Brand",             value: q.glassBrand },
      { label: "Glass Thickness",         value: q.glassThickness },
      { label: "Door/Window Remarks",     value: q.doorWindowRemarks },
      { label: "Interior Floor Type",     value: q.interiorFloorType },
      { label: "Interior Tile Brand",     value: q.interiorTileBrand },
      { label: "Roof Floor Type",         value: q.roofFloorType },
      { label: "Roof Tile Brand",         value: q.roofTileBrand },
      { label: "Interior Paint Brand",    value: q.interiorPaintBrand },
      { label: "Exterior Paint Brand",    value: q.exteriorPaintBrand },
      { label: "Exterior Paint Quality",  value: q.exteriorPaintingQuality },
      { label: "Quality Remarks",         value: q.qualityRemarks },
    ]);
    renderPhotoReferences(doc, "Cement Photos",     q.cementPhoto);
    renderPhotoReferences(doc, "Plastering Photos", q.plasteringPhoto);
  }

  spacer(doc, 8);
}
