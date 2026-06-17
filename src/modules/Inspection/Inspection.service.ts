import prisma from "../../shared/prisma";
import { logAudit } from "../../auditLogService";

// ─── SETUP ─────────────────────────────────────────────────────────

export const getInspectionSetupService = async (
  moduleSlug: string,
  projectId:  string
) => {
  const moduleName = moduleSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const inspectionModule = await prisma.inspection_module.findFirst({
    where: { name: { equals: moduleName, mode: "insensitive" } }
  });

  if (!inspectionModule) throw new Error(`Module '${moduleName}' not found`);

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

  // Stages mapped to this module via module_stage
  const moduleStages = await prisma.module_stage.findMany({
    where:   { moduleId: inspectionModule.id },
    include: { stage: true },
    orderBy: { stage: { name: "asc" } }
  });

  const stages = moduleStages.map((ms) => ({
    moduleStageId: ms.id,
    stageId:       ms.stageId,
    stageName:     ms.stage.name
  }));

  // Existing progress for this project
  const existingProgress = await prisma.inspection_progress.findMany({
    where:   { projectId, isActive: true },
    include: { stage: true, module: true }
  });

  return {
    project: {
      id:   project.id,
      name: project.projectName
    },
    blocks: project.blocks.map((b) => ({
      id:     b.id,
      name:   b.blockName,
      floors: b.floors.map((f) => ({ id: f.id, name: f.floorName }))
    })),
    stages,
    existingProgress: existingProgress.map((p) => ({
      progressId: p.id,
      blockId:    p.blockId,
      floorId:    p.floorId,
      roomNo:     p.roomNo,
      stageId:    p.stageId,
      stageName:  p.stage.name,
      status:     p.status
    }))
  };
};

// ─── CREATE PROGRESS ───────────────────────────────────────────────
// Returns existing progressId if the same unique combination already exists.

export const createProgressService = async (
  data: any,
  meta: { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.inspection_progress.findFirst({
    where: {
      projectId: data.projectId,
      moduleId:  data.moduleId,
      blockId:   data.blockId   ?? null,
      floorId:   data.floorId   ?? null,
      roomNo:    data.roomNo    ?? null,
      stageId:   data.stageId,
      isActive:  true
    }
  });

  if (existing) {
    return { progressId: existing.id, isExisting: true };
  }

  const created = await prisma.inspection_progress.create({
    data: {
      projectId:     data.projectId,
      moduleId:      data.moduleId,
      blockId:       data.blockId   ?? null,
      floorId:       data.floorId   ?? null,
      roomNo:        data.roomNo    ?? null,
      stageId:       data.stageId,
      remarks:       data.remarks   ?? null,
      progressPhoto: data.progressPhoto ?? undefined,
      status:        "IN_PROGRESS",
      isActive:      true
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

// ─── UPDATE PROGRESS ───────────────────────────────────────────────

export const updateProgressService = async (
  progressId: string,
  data:        any,
  meta:        { userId?: string; roleId?: string; ip?: string } = {}
) => {
  const existing = await prisma.inspection_progress.findUnique({
    where: { id: progressId }
  });

  if (!existing) throw new Error("Progress record not found");

  const updateData: any = {};
  if (data.remarks       !== undefined) updateData.remarks       = data.remarks;
  if (data.status        !== undefined) updateData.status        = data.status;
  if (data.progressPhoto !== undefined) updateData.progressPhoto = data.progressPhoto;

  await logAudit({
    tableName: "inspection_progress",
    recordId:  progressId,
    action:    "UPDATE",
    oldValue:  existing,
    newValue:  updateData,
    userId:    meta.userId,
    roleId:    meta.roleId,
    ipAddress: meta.ip
  });

  return prisma.inspection_progress.update({
    where: { id: progressId },
    data:  updateData
  });
};

// ─── SOFT DELETE PROGRESS ──────────────────────────────────────────

export const deleteProgressService = async (
  progressId: string,
  meta:        { userId?: string; roleId?: string; ip?: string } = {}
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

// ─── PROGRESS + QUESTIONS + ANSWERS ───────────────────────────────
// Loads everything needed to dynamically render the form screen.

export const getProgressDetailService = async (progressId: string) => {
  const progress = await prisma.inspection_progress.findUnique({
    where:   { id: progressId },
    include: { stage: true, module: true }
  });

  if (!progress) throw new Error("Progress not found");

  // Find the module_stage mapping to get questions
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
// Never delete-all + re-insert. Only updates changed values.

export const saveAnswersService = async (
  progressId: string,
  answers:    { questionId: string; optionId?: string; answer?: string; images?: { imageUrl: string }[] }[],
  meta:        { userId?: string; roleId?: string; ip?: string } = {}
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
      // Skip if nothing changed
      if (existing.answer === (item.answer ?? null) && existing.optionId === (item.optionId ?? null)) {
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

      // Replace images if provided
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

      // Insert images if provided
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

  // Recalculate and update status after answers saved
  const allQuestions = await prisma.inspection_question.findMany({
    where: { moduleStage: { moduleId: progress.moduleId, stageId: progress.stageId }, isActive: true }
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
// Never stored manually — always calculated from live data.

export const computeStatus = (
  progress:  { id: string } | null,
  questions: { id: string; isRequired: boolean }[],
  answers:   { questionId: string; answer?: string | null }[]
): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" => {
  if (!progress) return "NOT_STARTED";
  if (answers.length === 0) return "IN_PROGRESS";

  const answeredIds = new Set(
    answers.filter((a) => a.answer && a.answer.trim() !== "").map((a) => a.questionId)
  );

  const allRequiredAnswered = questions
    .filter((q) => q.isRequired)
    .every((q) => answeredIds.has(q.id));

  return allRequiredAnswered ? "COMPLETED" : "IN_PROGRESS";
};