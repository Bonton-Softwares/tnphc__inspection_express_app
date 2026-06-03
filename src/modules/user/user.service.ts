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
  accessType?: "SPECIFIC" | "FULL_JURISDICTION"; // optional when specialUnitId is set
  districts?: DistrictAssignment[];
  specialUnitId?: string | null;
  // specialUnitAccessType removed — special unit always stores as FULL_JURISDICTION
};

type CreateUserInput = {
  userName: string;
  email?: string;
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

/** Strip passwordHash before returning any user object */
function safeUser<T extends { passwordHash?: any }>(
  user: T
): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = user as any;
  return rest;
}

function safeUsers<T extends { passwordHash?: any }>(users: T[]) {
  return users.map(safeUser);
}

/** Resolve role name from DB if not supplied by client */
async function resolveRoleName(
  roleId: string,
  roleName?: string
): Promise<string> {
  if (roleName) return roleName.toLowerCase().trim();
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Invalid role selected");
  return role.name.toLowerCase().trim();
}

function isStandaloneRole(roleName: string): boolean {
  return STANDALONE_ROLES.map((r) => r.toLowerCase()).includes(roleName);
}

/**
 * Build user_management rows from a ManagementEntry list.
 *
 * Three paths:
 *
 * 1. specialUnitId present
 *    → ONE row: districtId=null, access_type=FULL_JURISDICTION, specialUnitId=set
 *    → No districts or accessType needed from client
 *
 * 2. accessType = FULL_JURISDICTION (no specialUnitId)
 *    → ONE row: districtId=null, access_type=FULL_JURISDICTION, specialUnitId=null
 *
 * 3. accessType = SPECIFIC (no specialUnitId)
 *    → ONE row per district/city entry
 *    → districts[] must have at least 1 entry
 */
function buildManagementRows(
  userId: string,
  managements: ManagementEntry[],
  createdById?: string
) {
  const rows: any[] = [];

  for (const entry of managements) {
    const base = {
      userId,
      departmentId: entry.departmentId,
      createdById: createdById ?? null,
      isActive: true,
    };

    const isSpecialUnit =
      !!entry.specialUnitId && entry.specialUnitId.trim() !== "";

    if (isSpecialUnit) {
      // ── PATH 1: Special Unit ───────────────────────────────
      // Always FULL_JURISDICTION; no district concept.
      rows.push({
        ...base,
        districtId: null,
        district_type: null,
        specialUnitId: entry.specialUnitId,
        access_type: "FULL_JURISDICTION",
      });
    } else if (entry.accessType === "FULL_JURISDICTION") {
      // ── PATH 2: Full Jurisdiction ──────────────────────────
      // One row, no district, no special unit.
      rows.push({
        ...base,
        districtId: null,
        district_type: null,
        specialUnitId: null,
        access_type: "FULL_JURISDICTION",
      });
    } else {
      // ── PATH 3: Specific Districts/Cities ──────────────────
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
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────
// GET ALL USERS
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
// CREATE USER
// ─────────────────────────────────────────────────────────────

export const createUserService = async (data: CreateUserInput) => {
  // ── Basic validation ──────────────────────────────────────
  if (!data.password) throw new Error("Password is required");
  if (!data.userName?.trim()) throw new Error("Username is required");
  if (!data.roleId) throw new Error("Role is required");

  // ── Resolve role ──────────────────────────────────────────
  const roleName = await resolveRoleName(data.roleId, data.roleName);
  const standalone = isStandaloneRole(roleName);

  // ── Non-standalone must have at least one management ──────
  if (!standalone) {
    if (!data.managements || data.managements.length === 0) {
      throw new Error(
        "At least one department assignment is required for this role"
      );
    }
    // Validate each management entry has the required fields
    for (const entry of data.managements) {
      const isSpecialUnit =
        !!entry.specialUnitId && entry.specialUnitId.trim() !== "";

      if (!isSpecialUnit && !entry.accessType) {
        throw new Error(
          `accessType is required for department ${entry.departmentId} when no specialUnitId is provided`
        );
      }

      if (!isSpecialUnit && entry.accessType === "SPECIFIC") {
        if (!entry.districts || entry.districts.length === 0) {
          throw new Error(
            `At least one district or city is required for SPECIFIC access on department ${entry.departmentId}`
          );
        }
      }
    }
  }

  // ── Username uniqueness ───────────────────────────────────
  const existingUser = await prisma.user.findFirst({
    where: { username: data.userName },
  });
  if (existingUser) throw new Error("Username already taken");

  // ── Hash password ─────────────────────────────────────────
  const passwordHash = await bcrypt.hash(data.password, 10);

  // ── Transaction: create user + management rows ────────────
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.userName,
        email: data.email ?? null,
        passwordHash,
        roleId: data.roleId,
        createdById: data.createdById ?? null,
        isActive: true,
      },
    });

    if (!standalone && data.managements && data.managements.length > 0) {
      const rows = buildManagementRows(user.id, data.managements, data.createdById);
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
// UPDATE USER
// ─────────────────────────────────────────────────────────────

export const updateUserService = async (id: string, data: UpdateUserInput) => {
  // ── Check user exists ─────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || !existing.isActive) throw new Error("User not found");

  // ── Username uniqueness ───────────────────────────────────
  if (data.userName && data.userName !== existing.username) {
    const unameExists = await prisma.user.findFirst({
      where: { username: data.userName, NOT: { id } },
    });
    if (unameExists) throw new Error("Username already taken");
  }

  // ── Build update payload ──────────────────────────────────
  const updatePayload: any = {
    updatedById: data.updatedById ?? null,
  };

  if (data.userName) updatePayload.username = data.userName;
  if (data.email) updatePayload.email = data.email;
  if (data.roleId) updatePayload.roleId = data.roleId;

  if (data.passwordTemp) {
    updatePayload.passwordHash = await bcrypt.hash(String(data.passwordTemp), 10);
  }

  return prisma.$transaction(async (tx) => {
    // ── Update user fields ────────────────────────────────
    await tx.user.update({ where: { id }, data: updatePayload });

    // ── Replace managements if provided ───────────────────
    if (data.managements !== undefined) {
      const roleId = data.roleId ?? existing.roleId;
      const roleName = await resolveRoleName(roleId, data.roleName);
      const standalone = isStandaloneRole(roleName);

      // Validate management entries (same rules as create)
      if (!standalone && data.managements && data.managements.length > 0) {
        for (const entry of data.managements) {
          const isSpecialUnit =
            !!entry.specialUnitId && entry.specialUnitId.trim() !== "";

          if (!isSpecialUnit && !entry.accessType) {
            throw new Error(
              `accessType is required for department ${entry.departmentId} when no specialUnitId is provided`
            );
          }

          if (!isSpecialUnit && entry.accessType === "SPECIFIC") {
            if (!entry.districts || entry.districts.length === 0) {
              throw new Error(
                `At least one district or city is required for SPECIFIC access on department ${entry.departmentId}`
              );
            }
          }
        }
      }

      // Soft-delete all existing active management rows
      await tx.user_management.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, updatedById: data.updatedById ?? null },
      });

      // Create new rows (unless standalone role)
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

// ─────────────────────────────────────────────────────────────
// LOGIN  (replace the existing loginService)
// ─────────────────────────────────────────────────────────────
export const loginService = async (data: {
  userName: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  const user = await prisma.user.findFirst({
    where: { username: data.userName, isActive: true },
    include: {
      role: true,
      userManagements: {
        where: { isActive: true },
        include: { department: true, district: true, specialUnit: true },
      },
    },
  });

  if (!user) throw new Error("Invalid credentials");

  if (!user.passwordHash || user.passwordHash.trim() === "") {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

  const { accessToken, refreshToken, sessionId } = generateTokens({
    id: user.id,
    email: user.email,
    userName: user.username,
    roleId: user.roleId,
    role: user.role?.name,
    isActive: user.isActive,
  });

  // Invalidate any existing active sessions, then create the new one
  await prisma.$transaction([
    prisma.user_session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    }),
    prisma.user_session.create({
      data: {
        userId: user.id,
        sessionId,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        isActive: true,
        lastActivity: new Date(),
      },
    }),
  ]);

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
// LOGOUT  (new — call from controller on POST /logout)
// ─────────────────────────────────────────────────────────────
export const logoutService = async (sessionId: string) => {
  await prisma.user_session.updateMany({
    where: { sessionId, isActive: true },
    data: { isActive: false },
  });
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