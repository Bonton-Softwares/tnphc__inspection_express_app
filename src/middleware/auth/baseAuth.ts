import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../shared/prisma";
import responses from "../../utils/responses";

const JWT_SECRET = process.env.JWT_SECRET as string;

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const baseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json(
      responses.generate("validationError", { message: "Authorization header missing" })
    );
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json(
      responses.generate("validationError", { message: "Token missing" })
    );
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json(
      responses.generate("loginFailed", { message: "Invalid or expired token", error: err })
    );
  }

  if (decoded.tokenUse !== "access") {
    return res.status(403).json(
      responses.generate("loginFailed", { message: "Invalid token type" })
    );
  }

  // ── Session check (the only new logic) ────────────────────
  const session = await prisma.user_session
    .findUnique({ where: { sessionId: decoded.sessionId } })
    .catch(() => null);

  if (!session || !session.isActive) {
    return res.status(401).json({
      success: false,
      message:
        "Your account is logged in on another device. Please logout and login again.",
    });
  }

  // Update last activity (fire-and-forget — don't await to keep latency low)
  prisma.user_session
    .update({
      where: { sessionId: decoded.sessionId },
      data: { lastActivity: new Date() },
    })
    .catch(() => {});

  req.user = {
    id: decoded.data.uid,
    userName: decoded.data.userName,
    email: decoded.data.email,
    roleId: decoded.data.roleId,
    role: decoded.data.role,
    isActive: decoded.data.isActive,
    sessionId: decoded.sessionId, // available to controllers if needed
  };

  next();
};