// ============================================================
// app/api/posts/route.ts — 社区帖子云同步
// GET  → 全部帖子（公开，按创建时间倒序）
// POST → 新建 / 更新帖子（含点赞、评论，客户端提交最新状态）
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

function mapPost(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    content: r.content,
    author: r.author,
    avatar: r.avatar,
    aiSummary: r.ai_summary,
    likes: Array.isArray(r.likes) ? r.likes : [],
    comments: Array.isArray(r.comments) ? r.comments : [],
    isSeed: Boolean(r.is_seed),
    createdAt: Number(r.created_at) || 0,
  };
}

export async function GET(_req: NextRequest) {
  if (!sql) return json({ ok: true, posts: [] }, 200);
  try {
    const rows =
      await sql`select * from posts order by created_at desc limit 200`;
    return json({ ok: true, posts: rows.map(mapPost) }, 200);
  } catch (e) {
    console.error("posts get error:", e);
    return json({ ok: false, error: "获取帖子失败" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return json({ ok: false, error: "请先登录后再发帖" }, 401);
  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);

  const body = (await tryJson(req)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "请求体不是合法 JSON" }, 400);

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category =
    typeof body.category === "string" ? body.category : "自由闲聊";
  const content = typeof body.content === "string" ? body.content : "";
  const author = typeof body.author === "string" ? body.author.slice(0, 40) : user.nickname || "机器人玩家";
  const avatar = typeof body.avatar === "string" ? body.avatar.slice(0, 8) : "🤖";
  const aiSummary = typeof body.aiSummary === "string" ? body.aiSummary.slice(0, 500) : "";
  const likes = Array.isArray(body.likes)
    ? body.likes.filter((x): x is string => typeof x === "string").slice(0, 500)
    : [];
  const comments = Array.isArray(body.comments)
    ? body.comments.slice(0, 200)
    : [];
  const createdAt = typeof body.createdAt === "number" ? body.createdAt : Date.now();

  if (!id || !title) return json({ ok: false, error: "缺少帖子 id 或标题" }, 400);
  if (!/^[A-Za-z0-9_\-]{4,40}$/.test(id)) {
    return json({ ok: false, error: "帖子 id 不合法" }, 400);
  }

  try {
    const rows =
      await sql`insert into posts (id, user_id, title, category, content, author, avatar, ai_summary, likes, comments, is_seed, created_at)
      values (${id}, ${user.uid}, ${title}, ${category}, ${content}, ${author}, ${avatar}, ${aiSummary}, ${likes}, ${comments}, false, ${createdAt})
      on conflict (id) do update set
        title = excluded.title,
        category = excluded.category,
        content = excluded.content,
        author = excluded.author,
        avatar = excluded.avatar,
        ai_summary = excluded.ai_summary,
        likes = excluded.likes,
        comments = excluded.comments,
        updated_at = now()
      returning *`;
    return json({ ok: true, post: mapPost(rows[0]) }, 200);
  } catch (e) {
    console.error("posts post error:", e);
    return json({ ok: false, error: "发帖失败" }, 500);
  }
}
