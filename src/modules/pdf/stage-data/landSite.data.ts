// src/modules/pdf/stage-data/landSite.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderLandSiteData(doc: any, stageData: any) {
  if (!stageData?.records?.length) return;

  const r = stageData.records[0];

  renderSectionHeading(doc, "Land Site Inspection", 1);
  spacer(doc, 4);

  renderSectionHeading(doc, "Encroachment", 2);
  renderFields(doc, [
    { label: "Is Encroachment",       value: r.isEncroachment },
    { label: "Encroachment %",        value: r.encroachmentPercent },
    { label: "Encroachment Type",     value: r.encroachmentType },
    { label: "Person Encroaching",    value: r.personEncroachingName },
    { label: "Is Court Case",         value: r.isCourtCase },
    { label: "Case Details",          value: r.caseDetails },
  ]);
  renderPhotoReferences(doc, "Encroachment Photos", r.encroachmentPhotos);

  renderSectionHeading(doc, "Existing Structure", 2);
  renderFields(doc, [
    { label: "Has Structure",   value: r.hasStructure },
    { label: "Details",        value: r.structureDetails },
  ]);
  renderPhotoReferences(doc, "Structure Photos", r.structurePhotos);

  renderSectionHeading(doc, "Drainage", 2);
  renderFields(doc, [
    { label: "Is Low Lying",         value: r.isLowLying },
    { label: "Water Depth (m)",      value: r.waterDepth },
    { label: "Water Duration (days)", value: r.waterDurationDays },
  ]);
  renderPhotoReferences(doc, "Drainage Photos", r.drainagePhotos);

  renderSectionHeading(doc, "Trees & Power Lines", 2);
  renderFields(doc, [
    { label: "Trees Count",      value: r.treesCount },
    { label: "Has Power Lines",  value: r.hasPowerLines },
    { label: "Power Line Details", value: r.powerLineDetails },
  ]);
  renderPhotoReferences(doc, "Tree Photos",       r.treesPhoto);
  renderPhotoReferences(doc, "Power Line Photos", r.powerLinePhotos);

  renderSectionHeading(doc, "Restricted Zones", 2);
  renderFields(doc, [
    { label: "Near Monument",      value: r.isNearMonument },
    { label: "Monument Name",      value: r.monumentName },
    { label: "Monument Distance",  value: r.monumentDistance },
    { label: "Near Sea",           value: r.isNearSea },
    { label: "Sea Distance",       value: r.seaDistance },
    { label: "Near Forest",        value: r.isNearForest },
    { label: "Forest Name",        value: r.forestName },
    { label: "Forest Distance",    value: r.forestDistance },
    { label: "Near Water Body",    value: r.isNearWaterBody },
    { label: "Water Body Name",    value: r.waterBodyName },
    { label: "Water Body Distance",value: r.waterBodyDistance },
    { label: "Near Burial Ground", value: r.isNearBurial },
    { label: "Burial Name",        value: r.burialName },
    { label: "Burial Distance",    value: r.burialDistance },
  ]);

  renderSectionHeading(doc, "Roads & Services", 2);
  renderFields(doc, [
    { label: "Road Type",           value: r.roadType },
    { label: "Road Width (m)",      value: r.roadWidth },
    { label: "Nearest Service",     value: r.nearestService },
    { label: "Service Distance (m)",value: r.serviceDistance },
  ]);

  spacer(doc, 8);
}
