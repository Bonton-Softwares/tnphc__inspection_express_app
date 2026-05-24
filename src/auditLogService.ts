import prisma from "./shared/prisma";

export const logAudit = async ({
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  userId,
  roleId,
  ipAddress
}: {
  tableName: string;
  recordId:  string;
  action:    "CREATE" | "UPDATE" | "DELETE";
  oldValue?: any;
  newValue?: any;
  userId?:   string;
  roleId?:   string;
  ipAddress?: string;
}) => {
  await prisma.auditLog.create({
    data: {
      tableName,
      recordId,
      action,
      oldValue:  oldValue  ?? undefined,
      newValue:  newValue  ?? undefined,
      userId,
      roleId,
      ipAddress
    }
  });
};