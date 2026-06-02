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
  hasType: boolean;
  hasGrade: boolean;
  types?: string[];
  grades?: string[];
  userId?: string;
}) => {
  const name = toTitleCase(data.name);
  const userId = data.userId || null;

  const existing = await prisma.material.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      isActive: true,
    },
  });

  if (existing) {
    throw new Error("Material already exists");
  }

  const material = await prisma.material.create({
    data: {
      name,
      hasType: data.hasType,
      hasGrade: data.hasGrade,
      createdById: userId,
    },
  });

  const typeIds: (string | null)[] = [];
  const gradeIds: (string | null)[] = [];

  // TYPES
  if (data.hasType) {
    for (const typeName of data.types || []) {
      const typeId = await upsertMaterialType(typeName, userId);
      typeIds.push(typeId);
    }
  } else {
    typeIds.push(null);
  }

  // GRADES
  if (data.hasGrade) {
    for (const gradeName of data.grades || []) {
      const gradeId = await upsertGrade(gradeName, userId);
      gradeIds.push(gradeId);
    }
  } else {
    gradeIds.push(null);
  }

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
        gradeId,
        createdById: userId,
      });
    }
  }

  if (materialGradeData.length) {
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
    where: {
      id,
      isActive: true,
    },
    include: {
      materialGrades: {
        where: { isActive: true },
        include: {
          grade: true,
          materialType: true,
        },
      },

      materialBrandGrades: {
        where: { isActive: true },
        include: {
          brand: true,
          grade: true,
          type: true,
        },
      },
    },
  });

  if (!material) {
    throw new Error("Material not found");
  }

  return formatMaterial(material);
};
// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
export const updateMaterialService = async (
  id: string,
  data: {
    name?: string;
    hasType?: boolean;
    hasGrade?: boolean;
    types?: string[];
    grades?: string[];
    userId?: string;
  }
) => {
  const userId = data.userId || null;

  const material = await prisma.material.findFirst({
    where: {
      id,
      isActive: true,
    },
  });

  if (!material) {
    throw new Error("Material not found");
  }

  const name = data.name
    ? toTitleCase(data.name)
    : material.name;

  if (data.name) {
    const duplicate = await prisma.material.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        isActive: true,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      throw new Error("Material already exists");
    }
  }

  const hasType =
    data.hasType !== undefined
      ? data.hasType
      : material.hasType;

  const hasGrade =
    data.hasGrade !== undefined
      ? data.hasGrade
      : material.hasGrade;

  await prisma.material.update({
    where: { id },
    data: {
      name,
      hasType,
      hasGrade,
      updatedById: userId,
    },
  });

  await prisma.material_grade.updateMany({
    where: {
      materialId: id,
      isActive: true,
    },
    data: {
      isActive: false,
      updatedById: userId,
    },
  });

  const typeIds: (string | null)[] = [];
  const gradeIds: (string | null)[] = [];

  // TYPES
  if (hasType) {
    for (const typeName of data.types || []) {
      const typeId = await upsertMaterialType(
        typeName,
        userId
      );

      typeIds.push(typeId);
    }
  } else {
    typeIds.push(null);
  }

  // GRADES
  if (hasGrade) {
    for (const gradeName of data.grades || []) {
      const gradeId = await upsertGrade(
        gradeName,
        userId
      );

      gradeIds.push(gradeId);
    }
  } else {
    gradeIds.push(null);
  }

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
        gradeId,
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

  materialBrandGrades: {
    where: { isActive: true },
    include: {
      brand: true,
      grade: true,
      type: true,
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
  const materialGrades = material.materialGrades || [];
  const materialBrandGrades = material.materialBrandGrades || [];

  // Grades
  const grades = Array.from(
    new Map(
      materialGrades
        .filter((mg: any) => mg.grade)
        .map((mg: any) => [
          mg.grade.id,
          {
            id: mg.grade.id,
            name: mg.grade.name,
          },
        ])
    ).values()
  );

  // Types
  const types = Array.from(
    new Map(
      materialGrades
        .filter((mg: any) => mg.materialType)
        .map((mg: any) => [
          mg.materialType.id,
          {
            id: mg.materialType.id,
            name: mg.materialType.name,
          },
        ])
    ).values()
  );

  // Brands
  const brands = Array.from(
    new Map(
      materialBrandGrades
        .filter((mbg: any) => mbg.brand)
        .map((mbg: any) => [
          mbg.brand.id,
          {
            id: mbg.brand.id,
            name: mbg.brand.name,
          },
        ])
    ).values()
  );

  // Brand Mapping
  const brandMappings = materialBrandGrades.map((mbg: any) => ({
    id: mbg.id,

    brand: mbg.brand
      ? {
          id: mbg.brand.id,
          name: mbg.brand.name,
        }
      : null,

    grade: mbg.grade
      ? {
          id: mbg.grade.id,
          name: mbg.grade.name,
        }
      : null,

    type: mbg.type
      ? {
          id: mbg.type.id,
          name: mbg.type.name,
        }
      : null,
  }));

  return {
    id: material.id,
    code: material.code,

    materialName: material.name,

    hasType: material.hasType,
    hasGrade: material.hasGrade,

    types,
    grades,
    brands,
    brandMappings,

    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
};