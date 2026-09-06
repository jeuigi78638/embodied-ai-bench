// ============================================================
// lib/admin.ts — 管理后台认证（独立于用户会话）
// 登录密码来自环境变量 ADMIN_PASSWORD（不落库、不落代码）。
// 登录成功后签发 role=admin 的 JWT（12 小时有效），存 HttpOnly Cookie。
// ============================================================

import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "eai_admin";
export const ADMIN_MAX_AGE = 12 * 60 * 60; // 12 小时

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET || "eai-bench-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

/** ADMIN_PASSWORD 是否已配置 */
export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** 常量时间比较，避免时序侧信道 */
export function checkAdminPassword(pw: string): boolean {
  const expect = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(String(pw), "utf8");
  const b = Buffer.from(expect, "utf8");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------- Admin JWT ----------
export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyAdminToken(
  token: string
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** 从 Cookie Header 中提取管理会话 token */
export function extractAdminToken(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === ADMIN_COOKIE) return part.slice(idx + 1).trim();
  }
  return null;
}
