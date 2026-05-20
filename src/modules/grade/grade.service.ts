import prisma from "../../shared/prisma";

const toTitleCase = (str: string): string =>
  str
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

// ─────────────────────────────────────────────
// CREATE
// grade lives globally; link stored in material_brand_grade
// ─────────────────────────────────────────────
export const createGradeService = async (data: {
  name: string;
  brandId: string;
  materialId: string;
  typeId?: string;
  userId?: string;
}) => {
  const userId = data.userId || null;

  const name = toTitleCase(data.name);

  // MATERIAL CHECK
  const material = await prisma.material.findFirst({
    where: {
      id: data.materialId,
      isActive: true,
    },
  });

  if (!material) {
    throw new Error("Material not found");
  }

  // BRAND CHECK
  const brand = await prisma.brand.findFirst({
    where: {
      id: data.brandId,
      isActive: true,
    },
  });

  if (!brand) {
    throw new Error("Brand not found");
  }

  // TYPE CHECK
  if (data.typeId) {
    const type = await prisma.material_type.findFirst({
      where: {
        id: data.typeId,
        isActive: true,
      },
    });

    if (!type) {
      throw new Error("Type not found");
    }
  }

  // BRAND + MATERIAL + TYPE MAPPING CHECK
  const brandMapped = await prisma.material_brand_grade.findFirst({
    where: {
      materialId: data.materialId,
      brandId: data.brandId,
      typeId: data.typeId || null,
      isActive: true,
    },
  });

  if (!brandMapped) {
    throw new Error(
      "Brand is not mapped with this material/type"
    );
  }

  // UPSERT GRADE
  let grade = await prisma.grade.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      isActive: true,
    },
  });

  if (!grade) {
    grade = await prisma.grade.create({
      data: {
        name,
        createdById: userId,
      },
    });
  }

  // DUPLICATE CHECK
  const alreadyExists =
    await prisma.material_brand_grade.findFirst({
      where: {
        materialId: data.materialId,
        brandId: data.brandId,
        typeId: data.typeId || null,
        gradeId: grade.id,
        isActive: true,
      },
    });

  if (alreadyExists) {
    throw new Error(
      "Grade already exists for this material + brand + type"
    );
  }

  // CREATE MAPPING
  await prisma.material_brand_grade.create({
    data: {
      materialId: data.materialId,
      brandId: data.brandId,
      typeId: data.typeId || null,
      gradeId: grade.id,
      createdById: userId,
    },
  });

  return getGradeByIdService(
    grade.id,
    data.materialId,
    data.brandId
  );
};

// ─────────────────────────────────────────────
// GET BY ID — grade with its brand+material context
// ─────────────────────────────────────────────
export const getGradeByIdService = async (
  id: string,
  materialId?: string,
  brandId?: string
) => {
  const grade = await prisma.grade.findFirst({
    where: { id, isActive: true },
    include: {
      materialBrandGrades: {
        where: {
          isActive: true,
          gradeId: id,
          ...(materialId ? { materialId } : {}),
          ...(brandId ? { brandId } : {}),
        },
        include: {
          material: true,
          brand: true,
        },
      },
    },
  });

  if (!grade) throw new Error("Grade not found");

  return formatGrade(grade);
};

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
export const updateGradeService = async (
  id: string,
  data: {
    name?: string;
    brandId?: string;
    materialId?: string;
    typeId?: string;
    userId?: string;
  }
) => {
  const userId = data.userId || null;

  const grade = await prisma.grade.findFirst({
    where: {
      id,
      isActive: true,
    },
  });

  if (!grade) {
    throw new Error("Grade not found");
  }

  // UPDATE NAME
  if (data.name) {
    const name = toTitleCase(data.name);

    const duplicate = await prisma.grade.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        isActive: true,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new Error("Grade already exists");
    }

    await prisma.grade.update({
      where: { id },
      data: {
        name,
        updatedById: userId,
      },
    });
  }

  // UPDATE MAPPING
  if (data.materialId && data.brandId) {
    // VALIDATE BRAND MAP
    const mapped =
      await prisma.material_brand_grade.findFirst({
        where: {
          materialId: data.materialId,
          brandId: data.brandId,
          typeId: data.typeId || null,
          isActive: true,
        },
      });

    if (!mapped) {
      throw new Error(
        "Brand is not mapped with this material/type"
      );
    }

    // DUPLICATE CHECK
    const duplicate =
      await prisma.material_brand_grade.findFirst({
        where: {
          materialId: data.materialId,
          brandId: data.brandId,
          typeId: data.typeId || null,
          gradeId: id,
          isActive: true,
        },
      });

    if (duplicate) {
      throw new Error(
        "This grade mapping already exists"
      );
    }

    // SOFT DELETE OLD
    await prisma.material_brand_grade.updateMany({
      where: {
        gradeId: id,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedById: userId,
      },
    });

    // CREATE NEW
    await prisma.material_brand_grade.create({
      data: {
        materialId: data.materialId,
        brandId: data.brandId,
        typeId: data.typeId || null,
        gradeId: id,
        createdById: userId,
      },
    });
  }

  return getGradeByIdService(id);
};

// ─────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────
export const deleteGradeService = async (id: string) => {
  const grade = await prisma.grade.findFirst({
    where: { id, isActive: true },
  });
  if (!grade) throw new Error("Grade not found");

  // Soft-delete all mappings for this grade
  await prisma.material_brand_grade.updateMany({
    where: { gradeId: id, isActive: true },
    data: { isActive: false },
  });

  return prisma.grade.update({
    where: { id },
    data: { isActive: false },
  });
};

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
export const listGradesService = async (query: any) => {
  const pageNumber = Number(query.pageNumber) || 1;
  const pageSize = Number(query.pageSize) || 10;
  const search = query.search?.trim();
  const brandId = query.brandId;
  const materialId = query.materialId;
  const skip = (pageNumber - 1) * pageSize;

  const where: any = { isActive: true };
  if (search) where.name = { contains: search, mode: "insensitive" };

  // Filter by brand or material via the junction table
  if (brandId || materialId) {
    where.materialBrandGrades = {
      some: {
        isActive: true,
        ...(brandId ? { brandId } : {}),
        ...(materialId ? { materialId } : {}),
      },
    };
  }

  const [grades, total] = await Promise.all([
    prisma.grade.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        materialBrandGrades: {
          where: {
            isActive: true,
            gradeId: { not: null },
            ...(brandId ? { brandId } : {}),
            ...(materialId ? { materialId } : {}),
          },
          include: { material: true, brand: true },
        },
      },
    }),
    prisma.grade.count({ where }),
  ]);

  return {
    total,
    pageNumber,
    pageSize,
    data: grades.map(formatGrade),
  };
};

// ─────────────────────────────────────────────
// FORMAT — grade with all its brand+material contexts
// ─────────────────────────────────────────────
const formatGrade = (grade: any) => {
  return {
    id: grade.id,
    code: grade.code,
    name: grade.name,
    // Every brand+material combo this grade is used in
    usedIn: grade.materialBrandGrades.map((mbg: any) => ({
      material: mbg.material
        ? { id: mbg.material.id, name: mbg.material.name, code: mbg.material.code }
        : null,
      brand: mbg.brand
        ? { id: mbg.brand.id, name: mbg.brand.name, code: mbg.brand.code }
        : null,
    })),
    createdAt: grade.createdAt,
    updatedAt: grade.updatedAt,
  };
};