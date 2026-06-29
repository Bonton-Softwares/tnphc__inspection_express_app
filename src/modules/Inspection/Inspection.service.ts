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

  if (!progressList.length) {
    return { floor: null, moduleId: inspectionModule.id, module: moduleName, rooms: [] };
  }

  const floor = progressList[0].floor;

  // Fetch all moduleStage mappings for this module once
  const moduleStages = await prisma.module_stage.findMany({
    where: { moduleId: inspectionModule.id }
  });

  // Build a quick lookup: stageId → moduleStageId
  const stageToModuleStageMap = new Map(
    moduleStages.map((ms) => [ms.stageId, ms.id])
  );

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
      moduleStageId: stageToModuleStageMap.get(r.stageId) ?? null,  // ← added
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

  return {
    floor,
    moduleId: inspectionModule.id,
    module: moduleName,
    rooms
  };
};

// ─── PROGRESS + QUESTIONS + ANSWERS ───────────────────────────────

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

  const rawAnswers = await prisma.inspection_answer.findMany({
    where:   { progressId },
    include: { images: true }
  });

  // Build a lookup of IMAGE-type question IDs
  const imageQuestionIds = new Set(
    questions
      .filter(q => q.fieldType === "IMAGE")
      .map(q => q.id)
  );

  // Parse stringified JSON answers for IMAGE fields
  const answers = rawAnswers.map(answer => {
    if (imageQuestionIds.has(answer.questionId) && typeof answer.answer === "string") {
      try {
        const parsed = JSON.parse(answer.answer);
        return { ...answer, answer: parsed };
      } catch {
        return answer;
      }
    }
    return answer;
  });

  // ── CHANGE 1: Build question map and enrich conditionalRendering ──

  // Build a flat map of id → question for O(1) lookups
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Enrich each question's conditionalRendering by replacing questionIds
  // with full question objects. DB is never touched — only the response shape changes.
  const enrichedQuestions = questions.map(q => {
    if (!q.conditionalRendering) return q;

    let parsed: any;
    try {
      parsed = typeof q.conditionalRendering === "string"
        ? JSON.parse(q.conditionalRendering as string)
        : q.conditionalRendering;
    } catch {
      return q; // leave malformed JSON as-is
    }

    if (!parsed?.rules || !Array.isArray(parsed.rules)) return q;

    const enrichedRules = parsed.rules.map((rule: any) => {
      const questionIds: string[] = rule.questionIds ?? [];
      const resolvedQuestions = questionIds
        .map((id: string) => {
          const child = questionMap.get(id);
          if (!child) return null;
          return {
            id:           child.id,
            question:     child.question,
            fieldType:    child.fieldType,
            type:         child.type,
            materialName: child.materialName,
            isRequired:   child.isRequired,
            options:      child.options,
            sortOrder:    child.sortOrder,
            minLimit:     child.minLimit,
            maxLimit:     child.maxLimit,
          };
        })
        .filter(Boolean);

      // Return the rule with `questions` (full objects) replacing `questionIds`
      const { questionIds: _drop, ...ruleWithoutIds } = rule;
      return { ...ruleWithoutIds, questions: resolvedQuestions };
    });

    return {
      ...q,
      conditionalRendering: { rules: enrichedRules }
    };
  });

  // ── END CHANGE 1 ─────────────────────────────────────────────────

  const status = computeStatus(progress, questions, answers);

  return {
    progress: { ...progress, status },
    questions: enrichedQuestions,  // enriched questions in response
    answers
  };
};


// ─── DYNAMIC STATUS ────────────────────────────────────────────────

export const computeStatus = (
  progress:  { id: string } | null,
  questions: { id: string; isRequired: boolean; conditionalRendering?: any }[],
  answers:   { questionId: string; answer?: string | null }[]
): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" => {
  if (!progress)            return "NOT_STARTED";
  if (answers.length === 0) return "IN_PROGRESS";

  const answeredIds = new Set(
    answers
      .filter((a) => {
        if (a.answer === null || a.answer === undefined) return false;
        const val = typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer);
        return val.trim() !== "";
      })
      .map((a) => a.questionId)
  );

  // ── CHANGE 2: Resolve which questions are currently visible ───────
  //
  // A question is "hidden" when it appears inside a conditionalRendering
  // rule whose triggering value does NOT match the current answer of the
  // parent question.
  //
  // Strategy:
  //   1. Build a map of parent answer values: questionId → answered value
  //   2. Walk every question that has conditionalRendering
  //   3. For each rule, check if the parent's answer matches rule.value
  //   4. Collect question IDs that are explicitly hidden (rule didn't match)
  //
  // A question that is never referenced in any conditionalRendering block
  // is always visible.

  // Map: questionId → current string answer (lowercased for bool comparison)
  const answerValueMap = new Map(
    answers
      .filter(a => a.answer !== null && a.answer !== undefined)
      .map(a => [
        a.questionId,
        typeof a.answer === "string" ? a.answer.trim().toLowerCase() : String(a.answer)
      ])
  );

  // Collect IDs that are conditionally hidden
  const hiddenQuestionIds = new Set<string>();

  for (const q of questions) {
    if (!q.conditionalRendering) continue;

    let parsed: any;
    try {
      parsed = typeof q.conditionalRendering === "string"
        ? JSON.parse(q.conditionalRendering as string)
        : q.conditionalRendering;
    } catch {
      continue;
    }

    if (!parsed?.rules || !Array.isArray(parsed.rules)) continue;

    const currentAnswer = answerValueMap.get(q.id);

    for (const rule of parsed.rules) {
      // Normalise the rule's trigger value to a string for comparison.
      // DB stores booleans as true/false but answers arrive as strings.
      const ruleValue = String(rule.value).toLowerCase(); // "true" | "false" | any string

      const ruleMatches = currentAnswer === ruleValue;

      const childIds: string[] = rule.questionIds ?? [];

      if (!ruleMatches) {
        // This rule's children are NOT visible right now
        childIds.forEach(id => hiddenQuestionIds.add(id));
      }
    }
  }

  // A question that is hidden in ANY rule but also visible in ANOTHER
  // matched rule should be considered visible. Remove from hidden set
  // if it appears in a matching rule.
  for (const q of questions) {
    if (!q.conditionalRendering) continue;

    let parsed: any;
    try {
      parsed = typeof q.conditionalRendering === "string"
        ? JSON.parse(q.conditionalRendering as string)
        : q.conditionalRendering;
    } catch {
      continue;
    }

    if (!parsed?.rules || !Array.isArray(parsed.rules)) continue;

    const currentAnswer = answerValueMap.get(q.id);

    for (const rule of parsed.rules) {
      const ruleValue   = String(rule.value).toLowerCase();
      const ruleMatches = currentAnswer === ruleValue;
      const childIds: string[] = rule.questionIds ?? [];

      if (ruleMatches) {
        // These children ARE visible — remove from hidden set
        childIds.forEach(id => hiddenQuestionIds.delete(id));
      }
    }
  }

  // ── END CHANGE 2 ─────────────────────────────────────────────────

  // Only required questions that are currently visible must be answered
  const allRequiredAnswered = questions
    .filter(q => q.isRequired && !hiddenQuestionIds.has(q.id))
    .every(q => answeredIds.has(q.id));

  return allRequiredAnswered ? "COMPLETED" : "IN_PROGRESS";
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

