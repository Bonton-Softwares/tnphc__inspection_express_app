import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid"; // ← ADD

// 🔐 Secrets
const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

// ⏱ Expiry
const ACCESS_EXPIRY = "1d";
const REFRESH_EXPIRY = "30d";

// ==============================
// ✅ Generate Access Token
// ==============================
export const generateAccessToken = (user: any, sessionId: string) => { // ← ADD sessionId param
  const payload = {
    data: {
      uid: user.id,
      email: user.email || null,
      userName: user.userName || null,

      roleId: user.roleId || null,
      role: user.role?.name || null,

      isActive: user.isActive ?? true
    },
    tokenUse: "access",
    sessionId // ← ADD
  };

  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY
  });
};

// ==============================
// ✅ Generate Refresh Token
// ==============================
export const generateRefreshToken = (user: any, sessionId: string) => { // ← ADD sessionId param
  const payload = {
    data: {
      uid: user.id
    },
    tokenUse: "refresh",
    sessionId // ← ADD
  };

  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY
  });
};

// ==============================
// ✅ Generate BOTH tokens (LOGIN)
// ==============================
export const generateTokens = (user: any) => {
  const sessionId = uuidv4(); // ← ADD: one ID shared by both tokens

  const accessToken = generateAccessToken(user, sessionId); // ← pass sessionId
  const refreshToken = generateRefreshToken(user, sessionId); // ← pass sessionId

  return {
    accessToken,
    refreshToken,
    sessionId // ← ADD: returned so loginService can store it in DB
  };
};

// ==============================
// ✅ Verify Access Token
// ==============================
export const verifyAccessToken = (token: string) => {
  try {
    const decoded: any = jwt.verify(token, ACCESS_SECRET);

    if (decoded.tokenUse !== "access") {
      throw new Error("Invalid access token");
    }

    return decoded;
  } catch (err) {
    throw new Error("Access token invalid or expired");
  }
};

// ==============================
// ✅ Verify Refresh Token
// ==============================
export const verifyRefreshToken = (token: string) => {
  try {
    const decoded: any = jwt.verify(token, REFRESH_SECRET);

    if (decoded.tokenUse !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    return decoded;
  } catch (err) {
    throw new Error("Refresh token invalid or expired");
  }
};

// ==============================
// ✅ Generate new Access Token using Refresh Token
// ==============================
export const generateAccessTokenFromRefresh = (refreshToken: string) => {
  const decoded: any = verifyRefreshToken(refreshToken);

  return generateAccessToken(
    { id: decoded.data.uid },
    decoded.sessionId // ← pass existing sessionId so the refreshed token stays linked to the same session
  );
};