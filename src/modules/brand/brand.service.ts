import prisma from "../../shared/prisma";

const toTitleCase = (str: string): string =>
  str
    .trim()
    .split(" ")
    .map(
      (w) =>
        w.charAt(0).toUpperCase() +
        w.slice(1).toLowerCase()
    )
    .join(" ");

// ─────────────────────────────────────────────
// CREATE BRAND
// ─────────────────────────────────────────────
export const createBrandService = async (
  data: {
    materialId: string;
    brands: {
      typeId?: string;
      names: string[];
    }[];
    userId?: string;
  }
) => {
  const userId = data.userId || null;

  // material validate
  const material =
    await prisma.material.findFirst({
      where: {
        id: data.materialId,
        isActive: true,
      },
    });

  if (!material) {
    throw new Error("Material not found");
  }

  const results: any[] = [];

  for (const item of data.brands) {

    // validate type only if material hasType
    if (material.hasType) {

      if (!item.typeId) {
        throw new Error(
          "typeId is required for typed material"
        );
      }

      const typeExists =
        await prisma.material_type.findFirst({
          where: {
            id: item.typeId,
            isActive: true,
          },
        });

      if (!typeExists) {
        throw new Error("Invalid typeId");
      }
    }

    for (const rawName of item.names) {

      const name = toTitleCase(rawName);

      // check brand exists
      let brand =
        await prisma.brand.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            isActive: true,
          },
        });

      let isNew = false;

      // create brand if not exists
      if (!brand) {
        brand = await prisma.brand.create({
          data: {
            name,
            createdById: userId,
          },
        });

        isNew = true;
      }

      // duplicate mapping check
      const alreadyMapped =
        await prisma.material_brand_grade.findFirst({
          where: {
            materialId: material.id,
            brandId: brand.id,
            typeId: item.typeId || null,
            isActive: true,
          },
        });

      if (alreadyMapped) {

        results.push({
          brand: name,
          typeId: item.typeId || null,
          status: "already_exists",
        });

        continue;
      }

      // create mapping
      await prisma.material_brand_grade.create({
        data: {
          materialId: material.id,
          brandId: brand.id,
          gradeId: null,
          typeId: item.typeId || null,
          createdById: userId,
        },
      });

      results.push({
        brand: name,
        typeId: item.typeId || null,
        status: isNew
          ? "created"
          : "mapped",
        data: await getBrandByIdService(
          brand.id
        ),
      });
    }
  }

  return results;
};

// ─────────────────────────────────────────────
// GET BRAND BY ID
// ─────────────────────────────────────────────
export const getBrandByIdService = async (
  id: string
) => {

  const brand =
    await prisma.brand.findFirst({
      where: {
        id,
        isActive: true,
      },

      include: {
        materialBrandGrades: {
          where: {
            isActive: true,
          },

          include: {
            material: true,
            grade: true,
            type: true,
          },
        },
      },
    });

  if (!brand) {
    throw new Error("Brand not found");
  }

  return formatBrand(brand);
};

// ─────────────────────────────────────────────
// UPDATE BRAND
// ─────────────────────────────────────────────
export const updateBrandService = async (
  id: string,
  data: {
    name?: string;
    userId?: string;
  }
) => {

  const userId = data.userId || null;

  const brand =
    await prisma.brand.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

  if (!brand) {
    throw new Error("Brand not found");
  }

  if (data.name) {

    const name = toTitleCase(data.name);

    const duplicate =
      await prisma.brand.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id,
          },

          isActive: true,
        },
      });

    if (duplicate) {
      throw new Error(
        "Brand already exists"
      );
    }

    await prisma.brand.update({
      where: {
        id,
      },

      data: {
        name,
        updatedById: userId,
      },
    });
  }

  return getBrandByIdService(id);
};

// ─────────────────────────────────────────────
// DELETE BRAND
// ─────────────────────────────────────────────
export const deleteBrandService = async (
  id: string
) => {

  const brand =
    await prisma.brand.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

  if (!brand) {
    throw new Error("Brand not found");
  }

  await prisma.material_brand_grade.updateMany(
    {
      where: {
        brandId: id,
        isActive: true,
      },

      data: {
        isActive: false,
      },
    }
  );

  return prisma.brand.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },
  });
};

// ─────────────────────────────────────────────
// LIST BRANDS
// ─────────────────────────────────────────────
export const listBrandsService = async (
  query: any
) => {

  const pageNumber =
    Number(query.pageNumber) || 1;

  const pageSize =
    Number(query.pageSize) || 10;

  const skip =
    (pageNumber - 1) * pageSize;

  const where: any = {
    isActive: true,
  };

  if (query.search) {

    where.name = {
      contains: query.search,
      mode: "insensitive",
    };
  }

  const [brands, total] =
    await Promise.all([

      prisma.brand.findMany({
        where,

        skip,
        take: pageSize,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          materialBrandGrades: {
            where: {
              isActive: true,
            },

            include: {
              material: true,
              grade: true,
              type: true,
            },
          },
        },
      }),

      prisma.brand.count({
        where,
      }),
    ]);

  return {
    total,
    pageNumber,
    pageSize,
    data: brands.map(formatBrand),
  };
};

// ─────────────────────────────────────────────
// FORMAT RESPONSE
// ─────────────────────────────────────────────
const formatBrand = (brand: any) => {

  const materialMap = new Map();

  for (const mbg of brand.materialBrandGrades) {

    if (!materialMap.has(mbg.materialId)) {

      materialMap.set(mbg.materialId, {
        id: mbg.material.id,
        name: mbg.material.name,
        code: mbg.material.code,
        grades: [],
        types: [],
      });
    }

    const material =
      materialMap.get(mbg.materialId);

    // grades
    if (
      mbg.grade &&
      !material.grades.some(
        (g: any) => g.id === mbg.grade.id
      )
    ) {

      material.grades.push({
        id: mbg.grade.id,
        name: mbg.grade.name,
      });
    }

    // types
    if (
      mbg.type &&
      !material.types.some(
        (t: any) => t.id === mbg.type.id
      )
    ) {

      material.types.push({
        id: mbg.type.id,
        name: mbg.type.name,
      });
    }
  }

  return {
    id: brand.id,
    code: brand.code,
    name: brand.name,
    materials: Array.from(
      materialMap.values()
    ),
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
};


