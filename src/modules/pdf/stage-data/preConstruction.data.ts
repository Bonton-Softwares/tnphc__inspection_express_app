// src/modules/pdf/stage-data/preConstruction.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";
import { renderPhotoReferences }         from "../helpers/renderPhotos";

export function renderPreConstructionData(doc: any, stageData: any) {
  if (!stageData?.records?.length) return;
  const r = stageData.records[0];

  renderSectionHeading(doc, "Pre-Construction Inspection", 1);
  spacer(doc, 4);

  renderSectionHeading(doc, "Permissions & Site", 2);
  renderFields(doc, [
    { label: "Permission Obtained",   value: r.isPermissionObtained },
    { label: "Permission Date",       value: r.permissionDate },
    { label: "Site Cleared",          value: r.isSiteCleared },
    { label: "Site Details",          value: r.siteDetails },
  ]);

  renderSectionHeading(doc, "Labour & Facilities", 2);
  renderFields(doc, [
    { label: "Labour Shed",           value: r.hasLabourShed },
    { label: "Shed Type",             value: r.labourShedType },
    { label: "Shed Area (sqm)",       value: r.labourShedArea },
    { label: "Water Supply",          value: r.hasWaterSupply },
    { label: "Toilet Facility",       value: r.hasToiletFacility },
    { label: "Electricity",           value: r.hasElectricity },
    { label: "Labour Count",          value: r.labourCount },
  ]);
  renderPhotoReferences(doc, "Water Supply Photos",  r.waterSupplyPhotos);
  renderPhotoReferences(doc, "Toilet Photos",        r.toiletPhotos);
  renderPhotoReferences(doc, "Electricity Photos",   r.electricityPhotos);
  renderPhotoReferences(doc, "Labour Photos",        r.labourPhotos);

  renderSectionHeading(doc, "Material & Access", 2);
  renderFields(doc, [
    { label: "Material Storage",      value: r.hasMaterialStorage },
    { label: "Material Type",         value: r.materialType },
    { label: "Temp Electricity",      value: r.hasTempElectricity },
    { label: "Water Type",            value: r.waterType },
    { label: "Access Road Good",      value: r.isAccessRoadGood },
    { label: "Remarks",               value: r.remarks },
  ]);
  renderPhotoReferences(doc, "Material Photos",      r.materialPhotos);
  renderPhotoReferences(doc, "Access Road Photos",   r.accessRoadPhotos);

  spacer(doc, 8);
}
