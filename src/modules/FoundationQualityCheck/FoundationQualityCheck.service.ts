import prisma from "../../shared/prisma";

export const createFoundationQualityCheckDB = (data: any) => {
  return prisma.foundationQualityCheck.create({ data });
};

export const getAllFoundationQualityCheckDB = (projectId: string) => {
  return prisma.foundationQualityCheck.findMany({
    where: { projectId, isActive: true }
  });
};

export const getFoundationQualityCheckByIdDB = (
  projectId: string
) => {
  return prisma.foundationQualityCheck.findFirst({
    where: {
      projectId,
      isActive: true
    }
  });
};

export const updateFoundationQualityCheckDB = (id: string, data: any) => {
  return prisma.foundationQualityCheck.update({ where: { id }, data });
};

export const deleteFoundationQualityCheckDB = (id: string) => {
  return prisma.foundationQualityCheck.update({
    where: { id },
    data: { isActive: false }
  });
};




// 🔹 SINGLE PROJECT
export const getFoundationCombinedByProjectDB = async (projectId: string) => {
  const [progress, quality] = await Promise.all([
    prisma.foundationProgress.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.foundationQualityCheck.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return {
    foundationProgress: progress,
    foundationQualityCheck: quality
  };
};

// 🔹 ALL PROJECTS
export const getAllFoundationCombinedDB = async () => {
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    include: {
      foundationProgresses: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      },
      foundationQualityChecks: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return projects.map((p) => ({
    projectId: p.id,
    projectName: p.projectName,
    locationName: p.location,
    foundationProgress: p.foundationProgresses,
    foundationQualityCheck: p.foundationQualityChecks
  }));
};