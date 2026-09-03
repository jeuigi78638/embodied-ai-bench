// ============================================================
// app/api/robots/route.ts — 我的机器人云同步（登录用户）
// GET  → 我的机器人列表
// POST → 新增 / 更新机器人（upsert）
// DELETE?id= → 删除（仅本人）
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";
import { json, tryJson } from "@/lib/api";

export const dynamic = "force-dynamic";

async function currentUser(req: NextRequest) {
  const token = extractToken(req.headers.get("cookie"));
  if (!token) return null;
  return verifyToken(token);
}

function mapRobot(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    role: r.role,
    skills: Array.isArray(r.skills) ? r.skills : [],
    style: r.style,
    systemPrompt: r.system_prompt,
    model: r.model,
    createdAt: Number(r.created_at) || 0,
  };
}

export async function GET(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return json({ ok: true, robots: [] }, 200); // 未登录：前端用本地数据
  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);
  try {
    const rows =
      await sql`select * from robots where user_id = ${user.uid} order by updated_at desc`;
    return json({ ok: true, robots: rows.map(mapRobot) }, 200);
  } catch (e) {
    console.error("robots get error:", e);
    return json({ ok: false, error: "获取机器人失败" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return json({ ok: false, error: "请先登录" }, 401);
  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);

  const body = (await tryJson(req)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "请求体不是合法 JSON" }, 400);

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const avatar = typeof body.avatar === "string" ? body.avatar : "🤖";
  const role = typeof body.role === "string" ? body.role : "arm";
  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string").slice(0, 8)
    : [];
  const style = typeof body.style === "string" ? body.style : "rigor";
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.slice(0, 4000) : "";
  const model = typeof body.model === "string" ? body.model : "deepseek";
  const createdAt = typeof body.createdAt === "number" ? body.createdAt : Date.now();

  if (!name || !id) return json({ ok: false, error: "缺少机器人 id 或名字" }, 400);
  if (!/^[A-Za-z0-9_\-]{4,40}$/.test(id)) {
    return json({ ok: false, error: "机器人 id 不合法" }, 400);
  }

  try {
    const rows =
      await sql`insert into robots (id, user_id, name, avatar, role, skills, style, system_prompt, model, created_at)
      values (${id}, ${user.uid}, ${name}, ${avatar}, ${role}, ${skills}, ${style}, ${systemPrompt}, ${model}, ${createdAt})
      on conflict (id) do update set
        name = excluded.name,
        avatar = excluded.avatar,
        role = excluded.role,
        skills = excluded.skills,
        style = excluded.style,
        system_prompt = excluded.system_prompt,
        model = excluded.model,
        created_at = excluded.created_at,
        updated_at = now()
      returning *`;
    return json({ ok: true, robot: mapRobot(rows[0]) }, 200);
  } catch (e) {
    console.error("robots post error:", e);
    return json({ ok: false, error: "保存机器人失败" }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return json({ ok: false, error: "请先登录" }, 401);
  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return json({ ok: false, error: "缺少 id" }, 400);

  try {
    await sql`delete from robots where id = ${id} and user_id = ${user.uid}`;
    return json({ ok: true }, 200);
  } catch (e) {
    console.error("robots delete error:", e);
    return json({ ok: false, error: "删除失败" }, 500);
  }
}
