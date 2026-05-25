// user.service.ts
import prisma from "../../shared/prisma";
import bcrypt from "bcrypt";
import { generateTokens } from "../../utils/jwt";
import { STANDALONE_ROLES } from "./user.schema";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type DistrictAssignment = {
  districtId: string;
  districtType: "DISTRICT" | "CITY";
};

type ManagementEntry = {
  departmentId: string;
  accessType: "SPECIFIC" | "JURISDICTION";
  districts?: DistrictAssignment[];
  specialUnitId?: string | null;
  specialUnitAccessType?: "SPECIFIC" | "JURISDICTION";
};

type CreateUserInput = {
  userName: string;
  email: string;
  password: string;
  roleId: string;
  roleName?: string;
  managements?: ManagementEntry[];
  createdById?: string;
};

type UpdateUserInput = {
  userName?: string;
  email?: string;
  passwordTemp?: string;
  roleId?: string;
  roleName?: string;
  managements?: ManagementEntry[];
  updatedById?: string;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Strip sensitive fields before returning any user object */
function safeUser<T extends { passwordHash?: any }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = user as any;
  return rest;
}

/** Same but for arrays */
function safeUsers<T extends { passwordHash?: any }>(users: T[]) {
  return users.map(safeUser);
}

/** Resolve the role name from DB if not passed by client */
async function resolveRoleName(
  roleId: string,
  roleName?: string
): Promise<string> {
  if (roleName) return roleName.toLowerCase().trim();
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Invalid role selected");
  return role.name.toLowerCase().trim();
}

/** Returns true if the role bypasses department/district requirements */
function isStandaloneRole(roleName: string): boolean {
  return STANDALONE_ROLES.map((r) => r.toLowerCase()).includes(roleName);
}

/**
 * Build user_management rows from a ManagementEntry list.
 *
 * Rules:
 *  - JURISDICTION → one row with districtId = null
 *  - SPECIFIC     → one row per selected district/city
 *  - Special unit → additional row(s) if provided
 */
function buildManagementRows(
  userId: string,
  managements: ManagementEntry[],
  createdById?: string
) {
  const rows: any[] = [];

  for (const entry of managements) {
    // Field names must match the Prisma model field names exactly.
    // userId, departmentId, districtId, specialUnitId have NO @map() → use camelCase.
    // access_type, district_type are defined as snake_case directly in the model → use as-is.
    // createdById has @map("created_by") → use camelCase (createdById).
    // isActive has @map("is_active") → use camelCase (isActive).
    const base = {
      userId,
      departmentId: entry.departmentId,
      createdById: createdById ?? null,
      isActive: true,
    };

    if (entry.accessType === "JURISDICTION") {
      rows.push({
        ...base,
        districtId: null,
        district_type: null,
        specialUnitId: null,
        access_type: "JURISDICTION",
      });
    } else {
      // SPECIFIC — one row per selected district/city
      const districts = entry.districts ?? [];
      if (districts.length === 0) {
        throw new Error(
          `Select at least one district or city for department ${entry.departmentId}`
        );
      }
      for (const d of districts) {
        rows.push({
          ...base,
          districtId: d.districtId,
          district_type: d.districtType,
          specialUnitId: null,
          access_type: "SPECIFIC",
        });
      }
    }

    // Special unit rows (police only — caller enforces this)
    if (entry.specialUnitId) {
      if (entry.specialUnitAccessType === "JURISDICTION") {
        rows.push({
          ...base,
          districtId: null,
          district_type: null,
          specialUnitId: entry.specialUnitId,
          access_type: "JURISDICTION",
        });
      } else {
        const districts = entry.districts ?? [];
        for (const d of districts) {
          rows.push({
            ...base,
            districtId: d.districtId,
            district_type: d.districtType,
            specialUnitId: entry.specialUnitId,
            access_type: "SPECIFIC",
          });
        }
      }
    }
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────

export const getAllUsersService = async (filters?: {
  search?: string;
  roleId?: string;
  departmentId?: string;
  specialUnitId?: string;
  districtId?: string;
  pageNumber?: number;
  pageSize?: number;
}) => {
  const page = Number(filters?.pageNumber ?? 1);
  const size = Number(filters?.pageSize ?? 10);
  const skip = (page - 1) * size;

  const where: any = { isActive: true };

  if (filters?.search) {
    where.OR = [
      { username: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.roleId) where.roleId = filters.roleId;

  // Filter by department/district/specialUnit via userManagements
  const hasMgmtFilter =
    filters?.departmentId || filters?.districtId || filters?.specialUnitId;

  if (hasMgmtFilter) {
    where.userManagements = {
      some: {
        isActive: true,
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
        ...(filters?.districtId && { districtId: filters.districtId }),
        ...(filters?.specialUnitId && { specialUnitId: filters.specialUnitId }),
      },
    };
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
      include: {
        role: true,
        userManagements: {
          where: { isActive: true },
          include: {
            department: true,
            district: true,
            specialUnit: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data: safeUsers(data), total, page, size };
};

// ─────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────

export const getUserByIdService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      userManagements: {
        where: { isActive: true },
        include: {
          department: true,
          district: true,
          specialUnit: true,
        },
      },
    },
  });
  return user ? safeUser(user) : null;
};

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export const createUserService = async (data: CreateUserInput) => {
  if (!data.password) throw new Error("Password is required");
  if (!data.userName?.trim()) throw new Error("Username is required");
  // if (!data.email?.trim()) throw new Error("Email is required");
  if (!data.roleId) throw new Error("Role is required");

  const roleName = await resolveRoleName(data.roleId, data.roleName);
  const standalone = isStandaloneRole(roleName);

  // Non-standalone roles MUST have at least one management entry
  if (!standalone) {
    if (!data.managements || data.managements.length === 0) {
      throw new Error(
        "At least one department assignment is required for this role"
      );
    }
  }

  // Unique email (only if provided)
  // if (data.email && data.email.trim() !== "") {
  //   const existingEmail = await prisma.user.findUnique({
  //     where: { email: data.email },
  //   });
  //   if (existingEmail) throw new Error("Email already in use");
  // }

  // Unique username
  const existingUser = await prisma.user.findFirst({
    where: { username: data.userName },
  });
  if (existingUser) throw new Error("Username already taken");

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user + management rows in one transaction
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.userName,
        email: data.email,
        passwordHash,
        roleId: data.roleId,
        createdById: data.createdById ?? null,
        isActive: true,
      },
    });

    if (!standalone && data.managements && data.managements.length > 0) {
      const rows = buildManagementRows(
        user.id,
        data.managements,
        data.createdById
      );
      await tx.user_management.createMany({ data: rows });
    }

    const created = await tx.user.findUnique({
      where: { id: user.id },
      include: {
        role: true,
        userManagements: {
          where: { isActive: true },
          include: { department: true, district: true, specialUnit: true },
        },
      },
    });
    return created ? safeUser(created) : null;
  });
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export const updateUserService = async (id: string, data: UpdateUserInput) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || !existing.isActive) throw new Error("User not found");

  // // Email uniqueness
  // if (data.email && data.email !== existing.email) {
  //   const emailExists = await prisma.user.findFirst({
  //     where: { email: data.email, NOT: { id } },
  //   });
  //   if (emailExists) throw new Error("Email already in use");
  // }

  // Username uniqueness
  if (data.userName && data.userName !== existing.username) {
    const unameExists = await prisma.user.findFirst({
      where: { username: data.userName, NOT: { id } },
    });
    if (unameExists) throw new Error("Username already taken");
  }

  const updatePayload: any = {
    updatedById: data.updatedById ?? null,
  };

  if (data.userName) updatePayload.username = data.userName;
  if (data.email) updatePayload.email = data.email;
  if (data.roleId) updatePayload.roleId = data.roleId;

  if (data.passwordTemp) {
    updatePayload.passwordHash = await bcrypt.hash(
      String(data.passwordTemp),
      10
    );
  }

  return prisma.$transaction(async (tx) => {
    // Update user fields
    await tx.user.update({ where: { id }, data: updatePayload });

    // If managements are provided, replace them (soft-delete old, create new)
    if (data.managements !== undefined) {
      const roleId = data.roleId ?? existing.roleId;
      const roleName = await resolveRoleName(roleId, data.roleName);
      const standalone = isStandaloneRole(roleName);

      // Soft-delete all existing active management rows
      await tx.user_management.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, updatedById: data.updatedById ?? null },
      });

      // Create new rows (unless standalone role with empty managements)
      if (!standalone && data.managements && data.managements.length > 0) {
        const rows = buildManagementRows(id, data.managements, data.updatedById);
        await tx.user_management.createMany({ data: rows });
      }
    }

    const updated = await tx.user.findUnique({
      where: { id },
      include: {
        role: true,
        userManagements: {
          where: { isActive: true },
          include: { department: true, district: true, specialUnit: true },
        },
      },
    });
    return updated ? safeUser(updated) : null;
  });
};

// ─────────────────────────────────────────────────────────────
// SOFT DELETE
// ─────────────────────────────────────────────────────────────

export const deleteUserService = async (id: string, updatedById?: string) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || !existing.isActive) throw new Error("User not found");

  return prisma.$transaction(async (tx) => {
    await tx.user_management.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false, updatedById: updatedById ?? null },
    });
    const deleted = await tx.user.update({
      where: { id },
      data: { isActive: false, updatedById: updatedById ?? null },
    });
    return safeUser(deleted);
  });
};

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────

export const loginService = async (data: {
  userName: string;
  password: string;
}) => {
  const user = await prisma.user.findFirst({
    where: { username: data.userName, isActive: true },
    include: {
      role: true,
      userManagements: {
        where: { isActive: true },
        include: {
          department: true,
          district: true,
          specialUnit: true,
        },
      },
    },
  });

  if (!user) throw new Error("Invalid credentials");

  // Password check — support legacy plaintext → hash migration
  let isMatch = false;

  if (user.passwordHash && user.passwordHash.trim() !== "") {
    isMatch = await bcrypt.compare(data.password, user.passwordHash);
  } else {
    // No hash set at all — should not happen in normal flow
    throw new Error("Invalid credentials");
  }

  if (!isMatch) throw new Error("Invalid credentials");

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    userName: user.username,
    roleId: user.roleId,
    role: user.role?.name,
    isActive: user.isActive,
  });

  return {
    user: {
      id: user.id,
      userName: user.username,
      email: user.email,
      role: user.role,
      managements: user.userManagements,
    },
    accessToken,
    refreshToken,
  };
};

// ─────────────────────────────────────────────────────────────
// DROPDOWNS
// ─────────────────────────────────────────────────────────────

export const getDepartmentsService = async () => {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
};

export const getMasterDistrictsService = async (type?: "DISTRICT" | "CITY") => {
  return prisma.masterDistrict.findMany({
    where: {
      isActive: true,
      ...(type && { type }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, code: true },
  });
};

export const getRolesService = async () => {
  return prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
};

export const getSpecialUnitsService = async () => {
  return prisma.specialUnits.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
};