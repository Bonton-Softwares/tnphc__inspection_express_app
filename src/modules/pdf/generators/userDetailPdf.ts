// src/modules/pdf/generators/userDetailPdf.ts
import PDFDocument                                          from "pdfkit";
import { PDF_THEME as T }                                   from "../configs/pdfTheme";
import { STAGE_ORDER }                                      from "../configs/stageConfig";
import { renderHeader }                                     from "../helpers/renderHeader";
import { renderFooter }                                     from "../helpers/renderFooter";
import { renderSectionHeading, spacer, setPatchingFooters } from "../helpers/renderSection";
import { renderFields }                                     from "../helpers/renderFields";
import { renderTable }                                      from "../helpers/renderTable";

import { renderLandSiteData }        from "../stage-data/landSite.data";
import { renderPreConstructionData } from "../stage-data/preConstruction.data";
import { renderFoundationData }      from "../stage-data/foundation.data";
import { renderPlinthData }          from "../stage-data/plinth.data";
import { renderSuperStructureData }  from "../stage-data/superStructure.data";
import { renderInteriorsData }       from "../stage-data/interiors.data";
import { renderExteriorsData }       from "../stage-data/exteriors.data";
import { renderDevelopmentData }     from "../stage-data/development.data";
import { renderTakeoverData }        from "../stage-data/takeover.data";
import { renderModuleInspectionData } from "../stage-data/moduleInspection.data";

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

function stageHasData(s: any): boolean {
  if (!s) return false;
  if (s.records?.length)             return true;
  if (s.progresses?.length)          return true;
  if (s.qualityChecks?.length)       return true;
  if (s.buildingInspections?.length) return true;
  if (s.developmentWorks?.length)    return true;
  if (Array.isArray(s.blocks) && s.blocks.length > 0) {
    return s.blocks.some(
      (b: any) =>
        (typeof b.startedFloors === "number" && b.startedFloors > 0) ||
        b.qualityRecord != null
    );
  }
  return false;
}

export async function generateUserDetailPdf(params: {
  user:         any;
  projects:     any[];
  generatedBy?: string;
}): Promise<Buffer> {
  const { user, projects, generatedBy } = params;

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

      // ── COVER PAGE ──────────────────────────────────────────────────────
      renderHeader(
        doc,
        "USER PROJECT REPORT",
        `Officer: ${user.username}  |  Role: ${user.role}  |  Dept: ${user.department}`
      );

      spacer(doc, 10);
      renderSectionHeading(doc, "Officer Details", 2);
      renderFields(doc, [
        { label: "Name",       value: user.username },
        { label: "Email",      value: user.email },
        { label: "Role",       value: user.role },
        { label: "Department", value: user.department },
      ]);

      spacer(doc, 8);
      renderTable(doc, [
        { header: "#",          key: "idx",         width: 0.4 },
        { header: "Code",       key: "code",        width: 0.5 },
        { header: "Project",    key: "projectName", width: 2.5 },
        { header: "Status",     key: "status",      width: 1.2 },
        { header: "Stage",      key: "stage",       width: 1.5 },
        { header: "Done",       key: "completed",   width: 0.8 },
        { header: "Pending",    key: "pending",     width: 0.8 },
      ], projects.map((p: any, i: number) => ({
        idx:         i + 1,
        code:        `#${p.code}`,
        projectName: p.projectName,
        status:      p.status,
        stage:       p.currentStage,
        completed:   p.completedStages,
        pending:     p.pendingStages,
      })), "Assigned Projects Overview");

      // ── PER-PROJECT DETAIL ──────────────────────────────────────────────
      for (let idx = 0; idx < projects.length; idx++) {
        const project = projects[idx];
        doc.addPage();

        renderSectionHeading(doc, `Project ${idx + 1}: ${project.projectName}`, 1);
        spacer(doc, 4);

        renderFields(doc, [
          { label: "Code",          value: `#${project.code}` },
          { label: "Building Type", value: project.buildingType },
          { label: "Department",    value: project.departmentName },
          { label: "Location",      value: project.location },
          { label: "Status",        value: project.status },
          { label: "Current Stage", value: project.currentStage },
          { label: "Created At",    value: project.createdAt },
        ]);

        for (const key of STAGE_ORDER) {
          const stageData = project.stages[key];
          if (!stageData || !stageHasData(stageData)) continue;
          const renderer = STAGE_RENDERERS[key];
          if (renderer) await renderer(doc, stageData);
        }
      }

      // ── PATCH FOOTERS ───────────────────────────────────────────────────
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