// ============================================================
// app/api/auth/login/route.ts — 邮箱登录
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import {
  verifyPassword,
  signToken,
  AUTH_COOKIE,
  cookieOptions,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { json, tryJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await tryJson(req)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  if (!body) return json({ ok: false, error: "请求体不是合法 JSON" }, 400);

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return json({ ok: false, error: "请输入邮箱和密码" }, 400);
  }
  if (!sql) {
    return json(
      { ok: false, error: "数据库未配置（DATABASE_URL 缺失），暂无法登录" },
      503
    );
  }

  try {
    const rows =
      await sql`select id, email, password_hash, nickname from users where email = ${email} limit 1`;
    if (rows.length === 0) {
      return json({ ok: false, error: "邮箱或密码错误" }, 401);
    }
    const u = rows[0];
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) return json({ ok: false, error: "邮箱或密码错误" }, 401);

    const token = await signToken({
      uid: u.id,
      email: u.email,
      nickname: u.nickname,
    });
    const res = json(
      { ok: true, user: { id: u.id, email: u.email, nickname: u.nickname } },
      200
    );
    res.cookies.set(AUTH_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
    return res;
  } catch (e) {
    console.error("login error:", e);
    return json({ ok: false, error: "登录失败，请稍后重试" }, 500);
  }
}
