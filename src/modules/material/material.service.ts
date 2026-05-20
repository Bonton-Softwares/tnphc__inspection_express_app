import prisma from "../../shared/prisma";

// Utility: "cement board" → "Cement Board"
const toTitleCase = (str: string): string =>
  str
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

// Upsert a material_type by name (title-cased), return its id
const upsertMaterialType = async (
  name: string,
  userId: string | null
): Promise<string> => {
  const titleName = toTitleCase(name);
  let existing = await prisma.material_type.findFirst({
    where: { name: titleName, isActive: true },
  });
  if (!existing) {
    existing = await prisma.material_type.create({
      data: { name: titleName, createdById: userId },
    });
  }
  return existing.id;
};

// Upsert a grade by name (title-cased), return its id
const upsertGrade = async (
  name: string,
  userId: string | null
): Promise<string> => {
  const titleName = toTitleCase(name);
  let existing = await prisma.grade.findFirst({
    where: { name: titleName, isActive: true },
  });
  if (!existing) {
    existing = await prisma.grade.create({
      data: { name: titleName, createdById: userId },
    });
  }
  return existing.id;
};

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
export const createMaterialService = async (data: {
  name: string;
  types?: string[];
  grades?: string[];
  userId?: string;
}) => {
  const name = toTitleCase(data.name);
  const userId = data.userId || null;

  // Check duplicate
  const existing = await prisma.material.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isActive: true },
  });
  if (existing) throw new Error("Material already exists");

  const hasType = !!(data.types && data.types.length > 0);
  const hasGrade = !!(data.grades && data.grades.length > 0);

  // Create material
  const material = await prisma.material.create({
    data: {
      name,
      hasType,
      hasGrade,
      createdById: userId,
    },
  });

  // Resolve type ids
  const typeIds: (string | null)[] = [];
  if (hasType) {
    for (const typeName of data.types!) {
      const id = await upsertMaterialType(typeName, userId);
      typeIds.push(id);
    }
  } else {
    typeIds.push(null); // no type
  }

  // Resolve grade ids
  const gradeIds: (string | null)[] = [];
  if (hasGrade) {
    for (const gradeName of data.grades!) {
      const id = await upsertGrade(gradeName, userId);
      gradeIds.push(id);
    }
  } else {
    gradeIds.push(null); // no grade
  }

  // Create material_grade rows: cross-product of types × grades
  const materialGradeData: {
    materialId: string;
    materialTypeId: string | null;
    gradeId: string | null;
    createdById: string | null;
  }[] = [];

  for (const typeId of typeIds) {
    for (const gradeId of gradeIds) {
      materialGradeData.push({
        materialId: material.id,
        materialTypeId: typeId,
        gradeId: gradeId,
        createdById: userId,
      });
    }
  }

  if (materialGradeData.length > 0) {
    await prisma.material_grade.createMany({
      data: materialGradeData,
      skipDuplicates: true,
    });
  }

  return getMaterialByIdService(material.id);
};

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────
export const getMaterialByIdService = async (id: string) => {
  const material = await prisma.material.findFirst({
    where: { id, isActive: true },
    include: {
      materialGrades: {
        where: { isActive: true },
        include: {
          grade: true,
          materialType: true,
        },
      },
    },
  });

  if (!material) throw new Error("Material not found");

  return formatMaterial(material);
};

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
export const updateMaterialService = async (
  id: string,
  data: {
    name?: string;
    types?: string[];
    grades?: string[];
    userId?: string;
  }
) => {
  const userId = data.userId || null;

  // Check material exists
  const material = await prisma.material.findFirst({
    where: { id, isActive: true },
  });
  if (!material) throw new Error("Material not found");

  // Check name duplicate (if name is being changed)
  const name = data.name ? toTitleCase(data.name) : material.name;

  if (data.name) {
    const duplicate = await prisma.material.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        isActive: true,
        NOT: { id },
      },
    });
    if (duplicate) throw new Error("Material already exists");
  }

  const hasType =
    data.types !== undefined
      ? data.types.length > 0
      : material.hasType;

  const hasGrade =
    data.grades !== undefined
      ? data.grades.length > 0
      : material.hasGrade;

  // Update material record
  await prisma.material.update({
    where: { id },
    data: { name, hasType, hasGrade, updatedById: userId },
  });

  // If types or grades are being updated, replace material_grade rows
  if (data.types !== undefined || data.grades !== undefined) {
    // Soft-delete all existing material_grade rows for this material
    await prisma.material_grade.updateMany({
      where: { materialId: id, isActive: true },
      data: { isActive: false, updatedById: userId },
    });

    // Resolve NEW type ids
    let typeIds: (string | null)[] = [];
    if (data.types !== undefined) {
      if (data.types.length > 0) {
        for (const typeName of data.types) {
          const tid = await upsertMaterialType(typeName, userId);
          typeIds.push(tid);
        }
      } else {
        typeIds.push(null);
      }
    } else {
      // types not in update payload → keep current types
      const existingTypes = await prisma.material_grade.findMany({
        where: { materialId: id, isActive: false, materialTypeId: { not: null } },
        select: { materialTypeId: true },
        distinct: ["materialTypeId"],
      });
      typeIds =
        existingTypes.length > 0
          ? existingTypes.map((e) => e.materialTypeId)
          : [null];
    }

    // Resolve NEW grade ids
    let gradeIds: (string | null)[] = [];
    if (data.grades !== undefined) {
      if (data.grades.length > 0) {
        for (const gradeName of data.grades) {
          const gid = await upsertGrade(gradeName, userId);
          gradeIds.push(gid);
        }
      } else {
        gradeIds.push(null);
      }
    } else {
      const existingGrades = await prisma.material_grade.findMany({
        where: { materialId: id, isActive: false, gradeId: { not: null } },
        select: { gradeId: true },
        distinct: ["gradeId"],
      });
      gradeIds =
        existingGrades.length > 0
          ? existingGrades.map((e) => e.gradeId)
          : [null];
    }

    // Re-create cross-product
    const materialGradeData: {
      materialId: string;
      materialTypeId: string | null;
      gradeId: string | null;
      createdById: string | null;
    }[] = [];

    for (const typeId of typeIds) {
      for (const gradeId of gradeIds) {
        materialGradeData.push({
          materialId: id,
          materialTypeId: typeId,
          gradeId: gradeId,
          createdById: userId,
        });
      }
    }

    if (materialGradeData.length > 0) {
      await prisma.material_grade.createMany({
        data: materialGradeData,
        skipDuplicates: true,
      });
    }
  }

  return getMaterialByIdService(id);
};

// ─────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────
export const deleteMaterialService = async (id: string) => {
  const material = await prisma.material.findFirst({
    where: { id, isActive: true },
  });
  if (!material) throw new Error("Material not found");

  await prisma.material_grade.updateMany({
    where: { materialId: id, isActive: true },
    data: { isActive: false },
  });

  return prisma.material.update({
    where: { id },
    data: { isActive: false },
  });
};

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
export const listMaterialsService = async (query: any) => {
  const pageNumber = Number(query.pageNumber) || 1;
  const pageSize = Number(query.pageSize) || 10;
  const search = query.search?.trim();
  const skip = (pageNumber - 1) * pageSize;

  const where: any = { isActive: true };
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [materials, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        materialGrades: {
          where: { isActive: true },
          include: {
            grade: true,
            materialType: true,
          },
        },
      },
    }),
    prisma.material.count({ where }),
  ]);

  return {
    total,
    pageNumber,
    pageSize,
    data: materials.map(formatMaterial),
  };
};

// ─────────────────────────────────────────────
// FORMAT HELPER — shapes response cleanly
// ─────────────────────────────────────────────
const formatMaterial = (material: any) => {
  const grades = Array.from(
    new Map(
      material.materialGrades
        .filter((mg: any) => mg.grade)
        .map((mg: any) => [mg.grade.id, { id: mg.grade.id, name: mg.grade.name }])
    ).values()
  );

  const types = Array.from(
    new Map(
      material.materialGrades
        .filter((mg: any) => mg.materialType)
        .map((mg: any) => [
          mg.materialType.id,
          { id: mg.materialType.id, name: mg.materialType.name },
        ])
    ).values()
  );

  return {
    id: material.id,
    code: material.code,
    name: material.name,
    hasType: material.hasType,
    hasGrade: material.hasGrade,
    types,
    grades,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
};