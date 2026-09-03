// ============================================================
// app/api/auth/register/route.ts — 邮箱注册
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import {
  hashPassword,
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
    nickname?: unknown;
  } | null;
  if (!body) return json({ ok: false, error: "请求体不是合法 JSON" }, 400);

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nickname =
    typeof body.nickname === "string" && body.nickname.trim()
      ? body.nickname.trim().slice(0, 20)
      : email.split("@")[0] || "机器人玩家";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "邮箱格式不正确" }, 400);
  }
  if (password.length < 6) {
    return json({ ok: false, error: "密码至少 6 位" }, 400);
  }
  if (!sql) {
    return json(
      { ok: false, error: "数据库未配置（DATABASE_URL 缺失），暂无法注册" },
      503
    );
  }

  try {
    const existing =
      await sql`select id from users where email = ${email} limit 1`;
    if (existing.length > 0) {
      return json({ ok: false, error: "该邮箱已注册，请直接登录" }, 409);
    }
    const hash = await hashPassword(password);
    const rows =
      await sql`insert into users (email, password_hash, nickname) values (${email}, ${hash}, ${nickname}) returning id, email, nickname`;
    const u = rows[0];
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
    console.error("register error:", e);
    return json({ ok: false, error: "注册失败，请稍后重试" }, 500);
  }
}
