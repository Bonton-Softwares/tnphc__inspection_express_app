// src/modules/pdf/stage-data/exteriors.data.ts
import { renderSectionHeading, spacer, checkPageBreak } from "../helpers/renderSection";
import { renderFields }         from "../helpers/renderFields";
import { renderTable }          from "../helpers/renderTable";
import { renderPhotoImages }    from "../helpers/renderPhotos";

export async function renderExteriorsData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Exteriors", 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Total Blocks",    value: stageData.totalBlocks },
    { label: "Quality Checked", value: stageData.qualityChecked },
  ]);

  if (!stageData.blocks?.length) return;

  for (const block of stageData.blocks) {
    checkPageBreak(doc, 40);
    renderSectionHeading(doc, `Block: ${block.blockName}`, 2);

    renderFields(doc, [
      { label: "Total Floors",     value: block.totalFloors },
      { label: "Started Floors",   value: block.startedFloors },
      { label: "Completed Floors", value: block.completedFloors },
      { label: "Status",           value: block.status },
    ]);

    if (block.floorDetails?.length) {
      renderTable(doc, [
        { header: "Floor",   key: "floorName", width: 1.5 },
        { header: "Stage",   key: "stage",     width: 2 },
        { header: "Status",  key: "status",    width: 1.5 },
        { header: "Remarks", key: "remarks",   width: 2 },
      ], block.floorDetails);
    }

    if (block.qualityRecord) {
      const q = block.qualityRecord;
      renderSectionHeading(doc, `Block ${block.blockName} — Exterior Quality`, 3);

      renderFields(doc, [
        { label: "Work Started",           value: q.workStartedDate },
        { label: "Is Delayed",             value: q.isDelayed },
        { label: "Delay Days",             value: q.delayDays },
        { label: "Delay Reason",           value: q.delayReason },
        { label: "General Remarks",        value: q.generalRemarks },
        { label: "Cement Grade",           value: q.cementGrade  ?? q.cementGradeId },
        { label: "Cement Brand",           value: q.cementBrand  ?? q.cementBrandId },
        { label: "Cement Lab Test",        value: q.cementLabTest },
        { label: "Sand Type",              value: q.sandType },
        { label: "Sand Lab Test",          value: q.sandLabTest },
        { label: "Sieve Test Done",        value: q.sandSieveTestDone },
        { label: "Aggregate Size",         value: q.aggregateSize },
        { label: "Water Lab Test",         value: q.waterLabTest },
        { label: "Concrete Lab Test",      value: q.concreteLabTest },
        { label: "Bricks Lab Test",        value: q.bricksLabTest },
        { label: "Plastering Done",        value: q.plasteringTestDone },
        { label: "Plastering Remarks",     value: q.plasteringRemarks },
        { label: "Door/Window Type",       value: q.doorWindowType },
        { label: "UPVC Brand",             value: q.upvcBrand },
        { label: "Glass Brand",            value: q.glassBrand },
        { label: "Glass Thickness",        value: q.glassThickness },
        { label: "Door/Window Remarks",    value: q.doorWindowRemarks },
        { label: "Interior Floor Type",    value: q.interiorFloorType },
        { label: "Interior Tile Brand",    value: q.interiorTileBrand },
        { label: "Interior Tile Remarks",  value: q.interiorTileRemarks },
        { label: "Roof Floor Type",        value: q.roofFloorType },
        { label: "Roof Tile Brand",        value: q.roofTileBrand },
        { label: "Roof Tile Remarks",      value: q.roofTileRemarks },
        { label: "Interior Paint Brand",   value: q.interiorPaintBrand },
        { label: "Interior Paint Quality", value: q.interiorPaintingQuality },
        { label: "Exterior Paint Brand",   value: q.exteriorPaintBrand },
        { label: "Exterior Paint Quality", value: q.exteriorPaintingQuality },
        { label: "Quality Remarks",        value: q.qualityRemarks },
      ]);

      await renderPhotoImages(doc, "Cement Photos",     q.cementPhoto);
      await renderPhotoImages(doc, "Sand Photos",       q.sandPhoto);
      await renderPhotoImages(doc, "Aggregate Photos",  q.aggregatePhoto);
      await renderPhotoImages(doc, "Concrete Photos",   q.concretePhoto);
      await renderPhotoImages(doc, "Bricks Photos",     q.bricksPhoto);
      await renderPhotoImages(doc, "Plastering Photos", q.plasteringPhoto);
    }

    spacer(doc, 6);
  }
}
