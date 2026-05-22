import prisma from "../../shared/prisma";

/**
 * Create Role
 */
export const createRoleService = async (data: {
  name: string;
  description: string;
}) => {
  return prisma.role.create({
    data,
  });
};

/**
 * Get All Roles (with pagination + search)
 */
export const getAllRolesService = async (
  pageNumber: number,
  pageSize: number,
  search?: string
) => {
  const skip = (pageNumber - 1) * pageSize;

  return prisma.role.findMany({
    where: {
      isActive: true,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }),
    },
    // skip,
    // take: pageSize,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get Role By ID
 */
export const getRoleByIdService = async (id: string) => {
  return prisma.role.findUnique({
    where: { id },
  });
};

/**
 * Update Role
 */
export const updateRoleService = async (
  id: string,
  data: { name?: string; description?: string }
) => {
  return prisma.role.update({
    where: { id },
    data,
  });
};

/**
 * Delete Role (Soft delete)
 */
export const deleteRoleService = async (id: string) => {
  return prisma.role.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};