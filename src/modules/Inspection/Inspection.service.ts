import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── SETUP ─────────────────────────────────────────────────────────

export const getInspectionSetupService = async (
  moduleSlug: string,
  projectId: string
) => {
  // Convert slug → UPPER_SNAKE_CASE to match DB values
  // e.g. "framed-structure"       → "FRAMED_STRUCTURE"
  //      "load-bearing-structure" → "LOAD_BEARING_STRUCTURE"
  //      "interior"               → "INTERIOR"
  //      "exterior"               → "EXTERIOR"
  const moduleName = moduleSlug.toUpperCase().replace(/-/g, "_");

  // ── 1. Resolve inspection module ────────────────────────────
  const inspectionModule = await prisma.inspection_module.findFirst({
    where: { name: { equals: moduleName, mode: "insensitive" } }
  });

  if (!inspectionModule) throw new Error(`Module '${moduleName}' not found`);

  // ── 2. Load project with blocks + floors ────────────────────
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blocks: {
        include: {
          floors: { orderBy: { floorNumber: "asc" } }
        }
      }
    }
  });

  if (!project) throw new Error("Project not found");

  // ── 3. Determine structure type ──────────────────────────────
  //   hasSuperStructure = true  → "FRAMED"        (has blocks/floors)
  //   hasSuperStructure = false → "LOAD_BEARING"  (no blocks/floors)
  const structureType: "FRAMED" | "LOAD_BEARING" = project.hasSuperStructure
    ? "FRAMED"
    : "LOAD_BEARING";

  // ── 4. Build blocks/floors payload ──────────────────────────
  const blocks =
    structureType === "FRAMED"
      ? project.blocks.map((b) => ({
          id: b.id,
          name: b.blockName,
          totalFloors: b.totalFloors,
          floors: b.floors.map((f) => ({
            id: f.id,
            name: f.floorName,
            floorNumber: f.floorNumber
          }))
        }))
      : [];

  // ── 5. Stages mapped to this module ─────────────────────────
  const moduleStages = await prisma.module_stage.findMany({
    where: { moduleId: inspectionModule.id },
    include: { stage: true },
    orderBy: { stage: { name: "asc" } }
  });

  const stages = moduleStages.map((ms) => ({
    moduleStageId: ms.id,
    stageId: ms.stageId,
    stageName: ms.stage.name
  }));

  // ── 6. Existing progress records scoped to this module ───────
  const existingProgress = await prisma.inspection_progress.findMany({
    where: {
      projectId,
      moduleId: inspectionModule.id,
      isActive: true
    },
    include: { stage: true, module: true, block: true, floor: true }
  });

  return {
    project: {
      id: project.id,
      name: project.projectName,
      hasSuperStructure: project.hasSuperStructure,
      structureType
    },
    structureType,
    blocks,
    stages,
    existingProgress: existingProgress.map((p) => ({
      progressId: p.id,
      blockId: p.blockId ?? null,
      blockName: p.block?.blockName ?? null,
      floorId: p.floorId ?? null,
      floorName: p.floor?.floorName ?? null,
      roomNo: p.roomNo ?? null,
      stageId: p.stageId,
      stageName: p.stage.name,
      moduleName: p.module.name,
      status: p.status
    }))
  };
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────

export const createProgressService = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  if (!data.moduleStageId) throw new Error("moduleStageId is required");

  // Derive moduleId + stageId from moduleStageId
  const moduleStage = await prisma.module_stage.findUnique({
    where: { id: data.moduleStageId },
    include: { module: true, stage: true }
  });

  if (!moduleStage) throw new Error("Invalid moduleStageId");

  const moduleId = moduleStage.moduleId;
  const stageId  = moduleStage.stageId;

  // Return existing if same combination already exists
  const existing = await prisma.inspection_progress.findFirst({
    where: {
      projectId: data.projectId,
      moduleId,
      blockId:  data.blockId  ?? null,
      floorId:  data.floorId  ?? null,
      roomNo:   data.roomNo   ?? null,
      stageId,
      isActive: true
    }
  });

  if (existing) {
    return { progressId: existing.id, isExisting: true };
  }

const created = await prisma.inspection_progress.create({
  data: {
    projectId: data.projectId,
    moduleId,
    blockId: data.blockId ?? null,
    floorId: data.floorId ?? null,
    roomNo: data.roomNo ?? null,
    stageId,

    workStartedDate: data.workStartedDate ?? null,
    isDelay: data.isDelay ?? false,
    delayDays: data.delayDays ?? null,
    delayReason: data.delayReason ?? null,
    delayOtherReason: data.delayOtherReason ?? null,

    remarks: data.generalRemarks ?? null,

    progressPhoto: data.progressPhoto ?? null,

    status: "IN_PROGRESS",
    isActive: true
  }
});
  await logAudit({
    tableName: "inspection_progress",
    recordId:  created.id,
    action:    "CREATE",
    newValue:  created,
    userId:    meta.userId,
    roleId:    meta.roleId,
    ipAddress: meta.ip
  });

  return { progressId: created.id, isExisting: false };
};


export const getProgressDataService = async (
  progressId: string
) => {
  const progress = await prisma.inspection_progress.findUnique({
    where: { id: progressId },
    include: {
      block: true,
      floor: true,
      stage: true,
      module: true
    }
  });

  if (!progress) {
    throw new Error("Progress record not found");
  }

  return progress;
};

// ─── UPDATE PROGRESS ───────────────────────────────────────────────

export const updateProgressService = async (
  progressId: string,
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.inspection_progress.findUnique({
    where: { id: progressId }
  });

  if (!existing) {
    throw new Error("Progress record not found");
  }

  const updateData: any = {};

  // Progress Details
  if (data.workStartedDate !== undefined) {
    updateData.workStartedDate = data.workStartedDate
      ? new Date(data.workStartedDate)
      : null;
  }

  if (data.isDelay !== undefined) {
    updateData.isDelay =
      data.isDelay === true || data.isDelay === "true";
  }

  if (data.delayDays !== undefined) {
    updateData.delayDays =
      data.delayDays !== null ? Number(data.delayDays) : null;
  }

  if (data.delayReason !== undefined) {
    updateData.delayReason = data.delayReason;
  }

  if (data.delayOtherReason !== undefined) {
    updateData.delayOtherReason = data.delayOtherReason;
  }

  if (data.generalRemarks !== undefined) {
    updateData.remarks = data.generalRemarks;
  }

  // Existing Fields
  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.progressPhoto !== undefined) {
    updateData.progressPhoto = data.progressPhoto;
  }

  await logAudit({
    tableName: "inspection_progress",
    recordId: progressId,
    action: "UPDATE",
    oldValue: existing,
    newValue: updateData,
    userId: meta.userId,
    roleId: meta.roleId,
    ipAddress: meta.ip
  });

  return prisma.inspection_progress.update({
    where: { id: progressId },
    data: updateData
  });
};

// ─── SOFT DELETE PROGRESS ──────────────────────────────────────────

export const deleteProgressService = async (
  progressId: string,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.inspection_progress.findUnique({
    where: { id: progressId }
  });

  if (!existing) throw new Error("Progress record not found");

  await logAudit({
    tableName: "inspection_progress",
    recordId:  progressId,
    action:    "DELETE",
    oldValue:  existing,
    userId:    meta.userId,
    roleId:    meta.roleId,
    ipAddress: meta.ip
  });

  return prisma.inspection_progress.update({
    where: { id: progressId },
    data:  { isActive: false }
  });
};



export const getProgressByModuleFloorService = async (
  moduleSlug: string,
  floorId: string
) => {
  const moduleName = moduleSlug.toUpperCase().replace(/-/g, "_");

  const inspectionModule = await prisma.inspection_module.findFirst({
    where: { name: { equals: moduleName, mode: "insensitive" } }
  });

  if (!inspectionModule) throw new Error(`Module '${moduleName}' not found`);

  const progressList = await prisma.inspection_progress.findMany({
    where: { floorId, moduleId: inspectionModule.id, isActive: true },
    include: {
      block: true,
      floor: true,
      stage: true,
      module: true
    },
    orderBy: { roomNo: "asc" }
  });

  if (!progressList.length) return { floor: null, module: moduleName, rooms: [] };

  const floor = progressList[0].floor;

  const grouped: Record<string, typeof progressList> = {};
  for (const p of progressList) {
    const key = p.roomNo ?? "__no_room__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  const rooms = Object.entries(grouped).map(([roomKey, records]) => ({
    roomNo: roomKey === "__no_room__" ? null : roomKey,
    totalStages: records.length,
    completedStages: records.filter((r) => r.status === "COMPLETED").length,
    overallStatus: records.every((r) => r.status === "COMPLETED")
      ? "COMPLETED"
      : records.some((r) => r.status === "IN_PROGRESS" || r.status === "COMPLETED")
      ? "IN_PROGRESS"
      : "NOT_STARTED",
    stages: records.map((r) => ({
      progressId: r.id,
      stageId: r.stageId,
      stageName: r.stage.name,
      status: r.status,
      workStartedDate: r.workStartedDate,
      isDelay: r.isDelay,
      remarks: r.remarks,
      progressPhoto: r.progressPhoto
    ? JSON.parse(r.progressPhoto as string)
    : null 
    }))
  }));

  return { floor, module: moduleName, rooms };
};

// ─── PROGRESS + QUESTIONS + ANSWERS ───────────────────────────────

export const getProgressDetailService = async (progressId: string) => {
  const progress = await prisma.inspection_progress.findUnique({
    where:   { id: progressId },
    include: { stage: true, module: true, block: true, floor: true }
  });

  if (!progress) throw new Error("Progress not found");

  const moduleStage = await prisma.module_stage.findFirst({
    where: { moduleId: progress.moduleId, stageId: progress.stageId }
  });

  if (!moduleStage) throw new Error("Module stage mapping not found");

  const questions = await prisma.inspection_question.findMany({
    where:   { moduleStageId: moduleStage.id, isActive: true },
    include: { options: true },
    orderBy: { sortOrder: "asc" }
  });

  const answers = await prisma.inspection_answer.findMany({
    where:   { progressId },
    include: { images: true }
  });

  const status = computeStatus(progress, questions, answers);

  return {
    progress: { ...progress, status },
    questions,
    answers
  };
};

// ─── SAVE ANSWERS (upsert per questionId) ─────────────────────────

export const saveAnswersService = async (
  progressId: string,
  answers: { questionId: string; optionId?: string; answer?: string; images?: { imageUrl: string }[] }[],
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const progress = await prisma.inspection_progress.findUnique({
    where: { id: progressId }
  });

  if (!progress) throw new Error("Progress record not found");

  const results: { questionId: string; action: "created" | "updated" | "unchanged" }[] = [];

  for (const item of answers) {
    const existing = await prisma.inspection_answer.findFirst({
      where: { progressId, questionId: item.questionId }
    });

    if (existing) {
      if (
        existing.answer   === (item.answer   ?? null) &&
        existing.optionId === (item.optionId ?? null)
      ) {
        results.push({ questionId: item.questionId, action: "unchanged" });
        continue;
      }

      const updated = await prisma.inspection_answer.update({
        where: { id: existing.id },
        data: {
          answer:   item.answer   ?? null,
          optionId: item.optionId ?? null
        }
      });

      if (item.images && item.images.length > 0) {
        await prisma.inspection_answer_image.deleteMany({ where: { answerId: existing.id } });
        await prisma.inspection_answer_image.createMany({
          data: item.images.map((img) => ({ answerId: existing.id, imageUrl: img.imageUrl }))
        });
      }

      await logAudit({
        tableName: "inspection_answer",
        recordId:  existing.id,
        action:    "UPDATE",
        oldValue:  { questionId: existing.questionId, answer: existing.answer, optionId: existing.optionId },
        newValue:  { questionId: updated.questionId,  answer: updated.answer,  optionId: updated.optionId },
        userId:    meta.userId,
        roleId:    meta.roleId,
        ipAddress: meta.ip
      });

      results.push({ questionId: item.questionId, action: "updated" });
    } else {
      const created = await prisma.inspection_answer.create({
        data: {
          progressId,
          questionId: item.questionId,
          optionId:   item.optionId ?? null,
          answer:     item.answer   ?? null
        }
      });

      if (item.images && item.images.length > 0) {
        await prisma.inspection_answer_image.createMany({
          data: item.images.map((img) => ({ answerId: created.id, imageUrl: img.imageUrl }))
        });
      }

      await logAudit({
        tableName: "inspection_answer",
        recordId:  created.id,
        action:    "CREATE",
        newValue:  { questionId: created.questionId, answer: created.answer, optionId: created.optionId },
        userId:    meta.userId,
        roleId:    meta.roleId,
        ipAddress: meta.ip
      });

      results.push({ questionId: item.questionId, action: "created" });
    }
  }

  const allQuestions = await prisma.inspection_question.findMany({
    where: {
      moduleStage: { moduleId: progress.moduleId, stageId: progress.stageId },
      isActive: true
    }
  });
  const allAnswers = await prisma.inspection_answer.findMany({ where: { progressId } });
  const newStatus  = computeStatus(progress, allQuestions, allAnswers);

  await prisma.inspection_progress.update({
    where: { id: progressId },
    data:  { status: newStatus }
  });

  return results;
};

// ─── DYNAMIC STATUS ────────────────────────────────────────────────

export const computeStatus = (
  progress:  { id: string } | null,
  questions: { id: string; isRequired: boolean }[],
  answers:   { questionId: string; answer?: string | null }[]
): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" => {
  if (!progress)            return "NOT_STARTED";
  if (answers.length === 0) return "IN_PROGRESS";

  const answeredIds = new Set(
    answers
      .filter((a) => a.answer && a.answer.trim() !== "")
      .map((a) => a.questionId)
  );

  const allRequiredAnswered = questions
    .filter((q) => q.isRequired)
    .every((q) => answeredIds.has(q.id));

  return allRequiredAnswered ? "COMPLETED" : "IN_PROGRESS";
};