// src/modules/pdf/generators/adminDashboardPdf.ts
import PDFDocument                                          from "pdfkit";
import { PDF_THEME as T }                                   from "../configs/pdfTheme";
import { STAGE_ORDER, STAGE_LABELS }                        from "../configs/stageConfig";
import { renderHeader }                                     from "../helpers/renderHeader";
import { renderFooter }                                     from "../helpers/renderFooter";
import { renderSectionHeading, spacer, checkPageBreak, setPatchingFooters } from "../helpers/renderSection";
import { renderFields }                                     from "../helpers/renderFields";
import { renderTable }                                      from "../helpers/renderTable";
import { applyFont, drawRect, drawHRule }                   from "../helpers/pdfStyles";

import { renderLandSiteData }        from "../stage-data/landSite.data";
import { renderPreConstructionData } from "../stage-data/preConstruction.data";
import { renderFoundationData }      from "../stage-data/foundation.data";
import { renderPlinthData }          from "../stage-data/plinth.data";
import { renderSuperStructureData }  from "../stage-data/superStructure.data";
import { renderInteriorsData }       from "../stage-data/interiors.data";
import { renderExteriorsData }       from "../stage-data/exteriors.data";
import { renderDevelopmentData }     from "../stage-data/development.data";
import { renderTakeoverData }        from "../stage-data/takeover.data";

const STAGE_RENDERERS: Record<string, (doc: any, data: any) => Promise<void> | void> = {
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
  if (stageData.records?.length)             return true;
  if (stageData.progresses?.length)          return true;
  if (stageData.qualityChecks?.length)       return true;
  if (stageData.buildingInspections?.length) return true;
  if (stageData.developmentWorks?.length)    return true;
  if (Array.isArray(stageData.blocks) && stageData.blocks.length > 0) {
    return stageData.blocks.some(
      (b: any) =>
        (typeof b.startedFloors === "number" && b.startedFloors > 0) ||
        b.qualityRecord != null
    );
  }
  return false;
}

function renderProjectSummary(doc: any, project: any) {
  const M       = T.spacing.pageMargin;
  const W       = T.page.width;
  const usableW = W - M * 2;

  drawRect(doc, M, doc.y, usableW, 1, T.colors.accent);
  doc.y += 4;

  renderFields(doc, [
    { label: "Project Code",    value: `#${project.code}` },
    { label: "Project Name",    value: project.projectName },
    { label: "Building Type",   value: project.buildingType },
    { label: "Department",      value: project.departmentName },
    { label: "Location",        value: project.location },
    { label: "Jurisdiction",    value: project.jurisdictionType },
    { label: "Access Type",     value: project.accessType },
    { label: "Status",          value: project.status },
    { label: "Current Stage",   value: project.currentStage },
    { label: "Created By",      value: project.createdBy?.username },
    { label: "Created At",      value: project.createdAt },
  ]);

  renderSectionHeading(doc, "Stage Progress", 2);
  renderFields(doc, [
    { label: "Total Stages",     value: project.selectedStageCount },
    { label: "Completed Stages", value: project.completedStages },
    { label: "Pending Stages",   value: project.pendingStages },
  ], 1);

  checkPageBreak(doc, 30);
  spacer(doc, 4);
  const badgeW = usableW / 5;
  const badgeH = 22;
  let   bx     = M;
  let   by     = doc.y;
  let   col    = 0;

  STAGE_ORDER.forEach((key) => {
    if (!project.stages[key]) return;
    const s  = project.stages[key];
    const bg = s.status === "COMPLETED"    ? T.colors.success
             : s.status === "IN_PROGRESS"  ? T.colors.warning
             : T.colors.muted;

    if (col === 5) {
      col = 0;
      bx  = M;
      by += badgeH + 4;
      checkPageBreak(doc, badgeH + 8);
    }

    drawRect(doc, bx, by, badgeW - 2, badgeH, bg);
    applyFont(doc, 6.5, true, T.colors.white);
    doc.text(STAGE_LABELS[key] ?? key, bx + 3, by + 3, {
      width: badgeW - 8, ellipsis: true, lineBreak: false,
    });
    applyFont(doc, 6, false, T.colors.white);
    doc.text(s.status.replace("_", " "), bx + 3, by + 13, {
      width: badgeW - 8, lineBreak: false,
    });

    bx += badgeW;
    col++;
  });

  doc.y = by + badgeH + 8;
}

export async function generateAdminDashboardPdf(params: {
  projects:    any[];
  summary:     any;
  filters?:    { districts?: string[]; departments?: string[]; stages?: string[] };
  generatedBy?: string;
}): Promise<Buffer> {
  const { projects, summary, filters, generatedBy } = params;

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

      const subtitle = buildSubtitle(filters);

      // ── COVER PAGE ──────────────────────────────────────────
      renderHeader(doc, "ADMIN INSPECTION REPORT", subtitle);

      spacer(doc, 12);
      renderFields(doc, [
        { label: "Total Projects",     value: summary.totalProjects },
        { label: "Completed Projects", value: summary.completedProjects },
        { label: "Ongoing Projects",   value: summary.ongoingProjects },
        { label: "Assigned Projects",  value: summary.assignedProjects },
      ], 2);

      if (filters) {
        spacer(doc, 6);
        renderSectionHeading(doc, "Applied Filters", 2);
        renderFields(doc, [
          { label: "Districts",   value: filters.districts?.join(", ")   || "All" },
          { label: "Departments", value: filters.departments?.join(", ") || "All" },
          { label: "Stages",      value: filters.stages?.join(", ")      || "All" },
        ], 1);
      }

      spacer(doc, 8);
      renderTable(doc, [
        { header: "#",          key: "idx",         width: 0.4 },
        { header: "Code",       key: "code",        width: 0.5 },
        { header: "Project",    key: "projectName", width: 2.5 },
        { header: "Department", key: "dept",        width: 1.5 },
        { header: "Status",     key: "status",      width: 1.2 },
        { header: "Stage",      key: "stage",       width: 1.5 },
        { header: "Completed",  key: "completed",   width: 0.8 },
        { header: "Pending",    key: "pending",     width: 0.8 },
      ], projects.map((p: any, i: number) => ({
        idx:         i + 1,
        code:        `#${p.code}`,
        projectName: p.projectName,
        dept:        p.departmentName,
        status:      p.status,
        stage:       p.currentStage,
        completed:   p.completedStages,
        pending:     p.pendingStages,
      })), "Project Summary");

      // ── PER-PROJECT DETAIL PAGES ─────────────────────────────
      for (let idx = 0; idx < projects.length; idx++) {
        const project = projects[idx];
        doc.addPage();

        renderSectionHeading(doc, `Project ${idx + 1}: ${project.projectName}`, 1);
        spacer(doc, 4);
        renderProjectSummary(doc, project);

        for (const key of STAGE_ORDER) {
          const stageData = project.stages[key];
          if (!stageData || !stageHasData(stageData)) continue;
          const renderer = STAGE_RENDERERS[key];
          if (renderer) await renderer(doc, stageData);
        }
      }

      // ── PATCH FOOTERS ────────────────────────────────────────
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

function buildSubtitle(
  filters?: { districts?: string[]; departments?: string[]; stages?: string[] }
): string {
  if (!filters) return `Generated on ${new Date().toLocaleDateString("en-IN")}`;
  const parts: string[] = [];
  if (filters.departments?.length) parts.push(`Dept: ${filters.departments.join(", ")}`);
  if (filters.districts?.length)   parts.push(`District: ${filters.districts.join(", ")}`);
  if (filters.stages?.length)      parts.push(`Stage: ${filters.stages.join(", ")}`);
  return parts.length ? parts.join(" | ") : `Generated on ${new Date().toLocaleDateString("en-IN")}`;
}