// ============================================================
// lib/auth.ts — 轻量 JWT 认证（邮箱 + 密码）
// 自研方案，依赖少且兼容 Node Runtime：
//  - jose：签发 / 校验 JWT（HttpOnly Cookie）
//  - bcryptjs：密码哈希（纯 JS）
// 会话有效期默认 30 天。
// ============================================================

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const AUTH_COOKIE = "eai_auth";
const SESSION_DAYS = 30;

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET || "eai-bench-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

// ---------- 密码 ----------
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(
  pw: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

// ---------- JWT ----------
export interface SessionPayload {
  uid: string;
  email: string;
  nickname: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const uid = payload.uid;
    const email = payload.email;
    const nickname = payload.nickname;
    if (typeof uid !== "string" || typeof email !== "string") return null;
    return {
      uid,
      email,
      nickname: typeof nickname === "string" ? nickname : "",
    };
  } catch {
    return null;
  }
}

// ---------- Cookie ----------
export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

/** 从 Cookie Header 中提取 JWT（供 Node API 使用） */
export function extractToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === AUTH_COOKIE) return part.slice(idx + 1).trim();
  }
  return null;
}
