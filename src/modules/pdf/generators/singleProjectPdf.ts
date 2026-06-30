// src/modules/pdf/generators/singleProjectPdf.ts
import PDFDocument                                          from "pdfkit";
import { STAGE_ORDER }                                      from "../configs/stageConfig";
import { renderHeader }                                     from "../helpers/renderHeader";
import { renderFooter }                                     from "../helpers/renderFooter";
import { renderSectionHeading, spacer, setPatchingFooters } from "../helpers/renderSection";
import { renderFields }                                     from "../helpers/renderFields";

import { renderLandSiteData }         from "../stage-data/landSite.data";
import { renderPreConstructionData }  from "../stage-data/preConstruction.data";
import { renderFoundationData }       from "../stage-data/foundation.data";
import { renderPlinthData }           from "../stage-data/plinth.data";
import { renderModuleInspectionData } from "../stage-data/moduleInspection.data";
import { renderDevelopmentData }      from "../stage-data/development.data";
import { renderTakeoverData }         from "../stage-data/takeover.data";

const STAGE_RENDERERS: Record<string, (doc: any, data: any) => Promise<void> | void> = {
  "Land Site Inspection":     renderLandSiteData,
  "Pre-Construction":         renderPreConstructionData,
  "Foundation Stage":         renderFoundationData,
  "Plinth Stage":             renderPlinthData,
  "Framed Structure":         renderModuleInspectionData,
  "Load Bearing Structure":   renderModuleInspectionData,
  "Interiors":                renderModuleInspectionData,
  "Exteriors":                renderModuleInspectionData,
  "Development Work":         renderDevelopmentData,
  "Take Over":                renderTakeoverData,
};

// ─── Does this stage have anything worth printing? ───────────────────────────
// Module-driven stages (Framed/Load Bearing Structure, Interiors, Exteriors)
// are checked via totalRecords, since they no longer carry the old
// blocks[].qualityRecord / startedFloors shape.
function stageHasData(s: any): boolean {
  if (!s) return false;
  if (s.records?.length)             return true;
  if (s.progresses?.length)          return true;
  if (s.qualityChecks?.length)       return true;
  if (s.buildingInspections?.length) return true;
  if (s.developmentWorks?.length)    return true;
  if (typeof s.totalRecords === "number" && s.totalRecords > 0) return true;
  return false;
}

export async function generateSingleProjectPdf(params: {
  project:      any;
  generatedBy?: string;
}): Promise<Buffer> {
  const { project, generatedBy } = params;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size:          "A4",
        margins:       { top: 10, bottom: 44, left: 40, right: 40 },
        autoFirstPage: true,
        bufferPages:   true,
      });

      const chunks: Buffer[] = [];
      doc.on("data",  (c: Buffer) => chunks.push(c));
      doc.on("error", reject);

      // ── HEADER ──────────────────────────────────────────────
      renderHeader(
        doc,
        "PROJECT INSPECTION REPORT",
        `${project.projectName}  |  Code: #${project.code}  |  Dept: ${project.departmentName}`
      );

      spacer(doc, 10);
      renderSectionHeading(doc, "Project Details", 2);
      renderFields(doc, [
        { label: "Project Code",   value: `#${project.code}` },
        { label: "Project Name",   value: project.projectName },
        { label: "Building Type",  value: project.buildingType },
        { label: "Department",     value: project.departmentName },
        { label: "Location",       value: project.location },
        { label: "Jurisdiction",   value: project.jurisdictionType },
        { label: "Access Type",    value: project.accessType },
        { label: "Status",         value: project.status },
        { label: "Current Stage",  value: project.currentStage },
        { label: "Created By",     value: project.createdBy?.username },
        { label: "Created At",     value: project.createdAt },
      ]);

      spacer(doc, 6);
      renderFields(doc, [
        { label: "Total Stages",     value: project.selectedStageCount },
        { label: "Completed Stages", value: project.completedStages },
        { label: "Pending Stages",   value: project.pendingStages },
      ], 1);

      // ── STAGE DETAILS ────────────────────────────────────────
      for (const key of STAGE_ORDER) {
        const stageData = project.stages[key];
        if (!stageData || !stageHasData(stageData)) continue;
        const renderer = STAGE_RENDERERS[key];
        if (renderer) await renderer(doc, stageData);
      }

      // ── PATCH FOOTERS ────────────────────────────────────────
      // setPatchingFooters(true) makes checkPageBreak a no-op so that
      // switchToPage() inside this loop can never trigger an extra blank page.
      setPatchingFooters(true);
      try {
        const range      = doc.bufferedPageRange();
        const totalPages = range.count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(range.start + i);
          renderFooter(doc, i + 1, totalPages, generatedBy);
        }
      } finally {
        setPatchingFooters(false);
      }

      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}