// src/modules/pdf/stage-data/development.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";

function jsonSummary(val: any): string {
  if (!val) return "—";
  if (typeof val === "string") {
    try { val = JSON.parse(val); } catch { return val; }
  }
  if (typeof val === "object") {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  }
  return String(val);
}

export function renderDevelopmentData(doc: any, stageData: any) {
  if (!stageData?.records?.length) return;
  const r = stageData.records[0];

  renderSectionHeading(doc, "Development Work", 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Sump Pump",             value: jsonSummary(r.sumpPump) },
    { label: "Borewell",              value: jsonSummary(r.borewell) },
    { label: "Inspection Chamber",    value: jsonSummary(r.inspectionChamber) },
    { label: "Storm Water Drains",    value: jsonSummary(r.stormWaterDrains) },
    { label: "Sullage Drain",         value: jsonSummary(r.sullageDrain) },
    { label: "Road",                  value: jsonSummary(r.road) },
    { label: "Paver Block",           value: jsonSummary(r.paverBlock) },
    { label: "Compound Wall",         value: jsonSummary(r.compoundWall) },
    { label: "Rain Water Harvesting", value: jsonSummary(r.rainWaterHarvesting) },
    { label: "Landscaping",           value: jsonSummary(r.landScaping) },
    { label: "Other Defects",         value: jsonSummary(r.otherDefects) },
    { label: "General Remarks",       value: jsonSummary(r.generalRemarks) },
  ], 1);

  spacer(doc, 8);
}
