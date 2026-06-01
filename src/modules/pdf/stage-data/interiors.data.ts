// src/modules/pdf/stage-data/interiors.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderTable }                   from "../helpers/renderTable";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderInteriorsData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Interiors", 1);
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
    renderSectionHeading(doc, "Interior Quality", 2);
    renderFields(doc, [
      { label: "Work Started",       value: q.workStartedDate },
      { label: "Is Delayed",         value: q.isDelay },
      { label: "Delay Days",         value: q.delayDays },
      { label: "Cement Grade",       value: q.cementGradeId },
      { label: "Sand Type",          value: q.sandType },
      { label: "Plastering Done",    value: q.plasteringTestDone },
      { label: "Door Wood Type",     value: q.doorWoodType },
      { label: "UPVC Brand",         value: q.upvcBrand },
      { label: "Glass Brand",        value: q.glassBrand },
      { label: "Glass Thickness",    value: q.glassThickness },
      { label: "Floor Type",         value: q.floorType },
      { label: "Tile Brand",         value: q.tileBrand },
      { label: "Tile Remarks",       value: q.tileRemarks },
      { label: "Paint Brand",        value: q.paintBrand },
      { label: "Painting Quality",   value: q.paintingQuality },
      { label: "Quality Remarks",    value: q.qualityRemarks },
    ]);
    renderPhotoReferences(doc, "Cement Photos",     q.cementPhoto);
    renderPhotoReferences(doc, "Plastering Photos", q.plasteringPhoto);
  }

  spacer(doc, 8);
}
