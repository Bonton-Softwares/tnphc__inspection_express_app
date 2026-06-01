// src/modules/pdf/generators/userDetailPdf.ts
import PDFDocument                        from "pdfkit";
import { PDF_THEME as T }                 from "../configs/pdfTheme";
import { STAGE_ORDER }                    from "../configs/stageConfig";
import { renderHeader }                   from "../helpers/renderHeader";
import { renderFooter }                   from "../helpers/renderFooter";
import { renderSectionHeading, spacer }   from "../helpers/renderSection";
import { renderFields }                   from "../helpers/renderFields";
import { renderTable }                    from "../helpers/renderTable";

import { renderLandSiteData }       from "../stage-data/landSite.data";
import { renderPreConstructionData }from "../stage-data/preConstruction.data";
import { renderFoundationData }     from "../stage-data/foundation.data";
import { renderPlinthData }         from "../stage-data/plinth.data";
import { renderSuperStructureData } from "../stage-data/superStructure.data";
import { renderInteriorsData }      from "../stage-data/interiors.data";
import { renderExteriorsData }      from "../stage-data/exteriors.data";
import { renderDevelopmentData }    from "../stage-data/development.data";
import { renderTakeoverData }       from "../stage-data/takeover.data";

const STAGE_RENDERERS: Record<string, (doc: any, data: any) => void> = {
  "Land Site Inspection":     renderLandSiteData,
  "Pre-Construction":         renderPreConstructionData,
  "Foundation Stage":         renderFoundationData,
  "Plinth Stage":             renderPlinthData,
  "Superstructure Stage":     renderSuperStructureData,
  "Non Superstructure Stage": renderSuperStructureData,
  "Interiors":                renderInteriorsData,
  "Exteriors":                renderExteriorsData,
  "Development Work":         renderDevelopmentData,
  "Take Over":                renderTakeoverData,
};

function stageHasData(stageData: any): boolean {
  if (!stageData) return false;
  return (
    stageData.records?.length            ||
    stageData.progresses?.length         ||
    stageData.qualityChecks?.length      ||
    stageData.blocks?.length             ||
    stageData.buildingInspections?.length||
    stageData.developmentWorks?.length   ||
    !!stageData.qualityRecord
  );
}

export async function generateUserDetailPdf(params: {
  user:        any;
  projects:    any[];
  generatedBy?: string;
}): Promise<Buffer> {
  const { user, projects, generatedBy } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:         "A4",
      margins:      { top: 10, bottom: 44, left: 40, right: 40 },
      autoFirstPage: true,
      bufferPages:  true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── COVER ────────────────────────────────────────────────
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

    // ── PER-PROJECT DETAIL ───────────────────────────────────
    projects.forEach((project: any, idx: number) => {
      doc.addPage();
      renderSectionHeading(doc, `Project ${idx + 1}: ${project.projectName}`, 1);
      spacer(doc, 4);

      renderFields(doc, [
        { label: "Code",         value: `#${project.code}` },
        { label: "Building Type",value: project.buildingType },
        { label: "Department",   value: project.departmentName },
        { label: "Location",     value: project.location },
        { label: "Status",       value: project.status },
        { label: "Current Stage",value: project.currentStage },
        { label: "Created At",   value: project.createdAt },
      ]);

      STAGE_ORDER.forEach((key) => {
        const stageData = project.stages[key];
        if (!stageData || !stageHasData(stageData)) return;
        const renderer = STAGE_RENDERERS[key];
        if (renderer) renderer(doc, stageData);
      });
    });

    // ── FOOTERS ──────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i);
      renderFooter(doc, i + 1, total, generatedBy);
    }

    doc.end();
  });
}
