// ============================================================
// app/api/posts/route.ts — 社区帖子云同步
// GET    → 全部帖子（公开，按创建时间倒序；登录时标注 owner）
// POST   → 新建 / 更新帖子（含点赞、评论，客户端提交最新状态）
// DELETE → 删除帖子（仅作者本人，?id=xxx）
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

async function currentUser(req: NextRequest) {
  const token = extractToken(req.headers.get("cookie"));
  if (!token) return null;
  return verifyToken(token);
}

function mapPost(r: Record<string, unknown>, uid?: string) {
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
    owner: Boolean(uid && r.user_id === uid),
    createdAt: Number(r.created_at) || 0,
  };
}

export async function GET(req: NextRequest) {
  if (!sql) return json({ ok: true, posts: [] }, 200);
  const token = extractToken(req.headers.get("cookie"));
  const user = token ? await verifyToken(token) : null;
  try {
    const rows =
      await sql`select * from posts order by created_at desc limit 200`;
    return json(
      { ok: true, posts: rows.map((r) => mapPost(r, user?.uid)) },
      200
    );
  } catch (e) {
    console.error("posts get error:", e);
    return json({ ok: false, error: "获取帖子失败" }, 500);
  }
}

export async function POST(req: NextRequest) {
  // 合规调整：社区调整为只读展示模式（站方发布精选内容），
  // 关闭用户公开发帖/修改接口，避免平台级用户生成内容的传播管理义务。
  return json(
    { ok: false, error: "社区已调整为只读展示模式，暂不支持发布新话题" },
    403
  );
}

export async function DELETE(req: NextRequest) {
  // 合规调整：社区只读模式下不允许用户删除帖子
  return json(
    { ok: false, error: "社区已调整为只读展示模式，暂不支持删除操作" },
    403
  );
}
