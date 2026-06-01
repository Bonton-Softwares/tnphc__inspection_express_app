// src/modules/pdf/stage-data/takeover.data.ts
import { renderSectionHeading, spacer } from "../helpers/renderSection";
import { renderFields }                  from "../helpers/renderFields";

function jsonSummary(val: any): string {
  if (!val) return "—";
  if (typeof val === "string") {
    try { val = JSON.parse(val); } catch { return val; }
  }
  if (typeof val === "object") {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join("; ");
  }
  return String(val);
}

function renderBuildingInspection(doc: any, r: any) {
  renderFields(doc, [
    { label: "Structure",           value: jsonSummary(r.structure) },
    { label: "Painting",            value: jsonSummary(r.painting) },
    { label: "Tiling / Flooring",   value: jsonSummary(r.tilingFlooring) },
    { label: "False Ceiling",       value: jsonSummary(r.falseCeiling) },
    { label: "Plumbing System",     value: jsonSummary(r.plumbingSystem) },
    { label: "Electrical System",   value: jsonSummary(r.electricalSystem) },
    { label: "Doors & Windows",     value: jsonSummary(r.doorsWindows) },
    { label: "Lifts",               value: jsonSummary(r.lifts) },
    { label: "Fire Fighting",       value: jsonSummary(r.fireFightingSystem) },
    { label: "Terrace Inspection",  value: jsonSummary(r.terraceInspection) },
  ], 1);
}

function renderDevelopmentWork(doc: any, r: any) {
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
}

export function renderTakeoverData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, "Take Over", 1);
  spacer(doc, 4);

  if (stageData.buildingInspections?.length) {
    renderSectionHeading(doc, "Building Inspection", 2);
    stageData.buildingInspections.forEach((r: any, i: number) => {
      if (stageData.buildingInspections.length > 1) {
        renderSectionHeading(doc, `Record ${i + 1}`, 3);
      }
      renderBuildingInspection(doc, r);
    });
  }

  if (stageData.developmentWorks?.length) {
    renderSectionHeading(doc, "Development Work", 2);
    stageData.developmentWorks.forEach((r: any, i: number) => {
      if (stageData.developmentWorks.length > 1) {
        renderSectionHeading(doc, `Record ${i + 1}`, 3);
      }
      renderDevelopmentWork(doc, r);
    });
  }

  spacer(doc, 8);
}
