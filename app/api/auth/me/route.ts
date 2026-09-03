// ============================================================
// app/api/auth/me/route.ts — 获取当前登录用户
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("cookie"));
  if (!token) return json({ ok: false, user: null }, 200);

  const payload = await verifyToken(token);
  if (!payload) return json({ ok: false, user: null }, 200);

  // 可选：从库中刷新昵称（若库不可用，仍返回 token 内信息）
  if (sql) {
    try {
      const rows =
        await sql`select id, email, nickname from users where id = ${payload.uid} limit 1`;
      if (rows.length === 0) return json({ ok: false, user: null }, 200);
      const u = rows[0];
      return json({ ok: true, user: { id: u.id, email: u.email, nickname: u.nickname } }, 200);
    } catch {
      /* 库异常时回退 token 信息 */
    }
  }
  return json(
    { ok: true, user: { id: payload.uid, email: payload.email, nickname: payload.nickname } },
    200
  );
}
