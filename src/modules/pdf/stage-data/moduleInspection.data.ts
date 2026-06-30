// src/modules/pdf/stage-data/moduleInspection.data.ts
import { renderSectionHeading, spacer, checkPageBreak } from "../helpers/renderSection";
import { renderFields }      from "../helpers/renderFields";
import { renderTable }       from "../helpers/renderTable";
import { renderPhotoImages } from "../helpers/renderPhotos";

/**
 * Generic renderer for any inspection_module-driven stage
 * (Framed Structure, Load Bearing Structure, Interiors, Exteriors).
 *
 * stageData shape (built in pdf.service.ts via resolveModuleStageDetail):
 * {
 *   label: string,
 *   totalRecords: number,
 *   completedRecords: number,
 *   blocks: [{
 *     blockName: string,
 *     floors: [{
 *       floorName: string,
 *       rooms: [{
 *         roomNo: string | null,
 *         overallStatus: string,
 *         stages: [{
 *           stageName: string,
 *           status: string,
 *           workStartedDate, isDelay, delayDays, delayReason, remarks,
 *           progressPhoto,
 *           answers: [{ question: string, fieldType: string, value: string, photos?: any }]
 *         }]
 *       }]
 *     }]
 *   }]
 * }
 */
export async function renderModuleInspectionData(doc: any, stageData: any) {
  if (!stageData) return;

  renderSectionHeading(doc, stageData.label, 1);
  spacer(doc, 4);

  renderFields(doc, [
    { label: "Total Records",     value: stageData.totalRecords },
    { label: "Completed Records", value: stageData.completedRecords },
  ]);

  if (!stageData.blocks?.length) return;

  for (const block of stageData.blocks) {
    checkPageBreak(doc, 40);
    renderSectionHeading(doc, `Block: ${block.blockName}`, 2);

    // Floor/room/stage status table
    const rows: any[] = [];
    for (const floor of block.floors ?? []) {
      for (const room of floor.rooms ?? []) {
        for (const stage of room.stages ?? []) {
          rows.push({
            floorName: floor.floorName,
            roomNo:    room.roomNo ?? "-",
            stage:     stage.stageName,
            status:    stage.status,
          });
        }
      }
    }

    if (rows.length) {
      renderTable(doc, [
        { header: "Floor",  key: "floorName", width: 1.3 },
        { header: "Room",   key: "roomNo",    width: 1 },
        { header: "Stage",  key: "stage",     width: 2 },
        { header: "Status", key: "status",    width: 1.5 },
      ], rows);
    }

    // Detailed answers per room/stage
    for (const floor of block.floors ?? []) {
      for (const room of floor.rooms ?? []) {
        for (const stage of room.stages ?? []) {
          if (!stage.answers?.length && !stage.remarks) continue;

          checkPageBreak(doc, 30);
          const roomLabel = room.roomNo ? ` / Room ${room.roomNo}` : "";
          renderSectionHeading(
            doc,
            `${floor.floorName}${roomLabel} — ${stage.stageName}`,
            3
          );

          renderFields(doc, [
            { label: "Work Started", value: stage.workStartedDate },
            { label: "Is Delayed",   value: stage.isDelay },
            { label: "Delay Days",   value: stage.delayDays },
            { label: "Delay Reason", value: stage.delayReason },
            { label: "Remarks",      value: stage.remarks },
            ...(stage.answers ?? [])
              .filter((a: any) => a.fieldType !== "IMAGE")
              .map((a: any) => ({ label: a.question, value: a.value })),
          ]);

          if (stage.progressPhoto) {
            await renderPhotoImages(doc, "Progress Photos", stage.progressPhoto);
          }

          for (const a of stage.answers ?? []) {
            if (a.fieldType === "IMAGE" && a.value) {
              await renderPhotoImages(doc, a.question, a.value);
            }
          }
        }
      }
    }

    spacer(doc, 6);
  }
}