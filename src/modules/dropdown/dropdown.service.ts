import prisma from "../../shared/prisma";

export const getMaterialBrandGradeDropdownService =
  async () => {

    const materials =
      await prisma.material.findMany({
        where: {
          isActive: true,
        },

        include: {

          // MATERIAL BRAND MAPPINGS
          materialBrandGrades: {
            where: {
              isActive: true,
            },

            include: {
              brand: true,
              grade: true,
              type: true,
            },
          },

          // MATERIAL GRADE MAPPINGS
          materialGrades: {
            where: {
              isActive: true,
            },

            include: {
              grade: true,
              materialType: true,
            },
          },
        },

        orderBy: {
          name: "asc",
        },
      });

    return materials.map((material) => {

      // UNIQUE TYPES
      const typesMap = new Map();

      // UNIQUE GRADES
      const gradesMap = new Map();

      // UNIQUE BRANDS
      const brandsMap = new Map();

      // BRAND MAPPINGS
      const brandMappings: any[] = [];

      // TYPES + GRADES
      for (const mg of material.materialGrades) {

        // TYPES
        if (
          mg.materialType &&
          !typesMap.has(mg.materialType.id)
        ) {

          typesMap.set(
            mg.materialType.id,
            {
              id: mg.materialType.id,
              name: mg.materialType.name,
            }
          );
        }

        // GRADES
        if (
          mg.grade &&
          !gradesMap.has(mg.grade.id)
        ) {

          gradesMap.set(
            mg.grade.id,
            {
              id: mg.grade.id,
              name: mg.grade.name,
            }
          );
        }
      }

      // BRANDS + BRAND MAPPINGS
      for (const mbg of material.materialBrandGrades) {

        // BRANDS
        if (
          mbg.brand &&
          !brandsMap.has(mbg.brand.id)
        ) {

          brandsMap.set(
            mbg.brand.id,
            {
              id: mbg.brand.id,
              name: mbg.brand.name,
            }
          );
        }

        // BRAND MAPPINGS
        brandMappings.push({
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
        });
      }

      return {
        id: material.id,
        code: material.code,

        materialName: material.name,

        hasType: material.hasType,
        hasGrade: material.hasGrade,

        types: Array.from(typesMap.values()),

        grades: Array.from(gradesMap.values()),

        brands: Array.from(brandsMap.values()),

        brandMappings,

        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      };
    });
  };