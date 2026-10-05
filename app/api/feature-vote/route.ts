// ============================================================
// app/api/feature-vote/route.ts — 功能需求投票
// GET  → 返回分区/功能项 + 实时得票数 + 本访客是否已投
// POST → 提交所选功能（1~5 个），每人限投一次（登录=账号，匿名=IP）
// 说明：纯投票数据统计，不涉及 AI 生成内容，无需内容标识。
// ============================================================

import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";
import { guardRequest, guardJson } from "@/lib/guard";
import {
  FEATURE_VOTE_GROUPS,
  FEATURE_VOTE_MAX,
  isValidFeatureId,
} from "@/lib/featureVotes";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  if (!sql) return;
  await sql`
    create table if not exists feature_votes (
      id text primary key,
      category text not null,
      name text not null,
      votes int not null default 0,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists feature_vote_log (
      id serial primary key,
      voter_key text not null unique,
      created_at timestamptz not null default now()
    )`;
  await sql`
    create index if not exists idx_feature_votes_cat on feature_votes (category)`;
  // seed：把功能选项写进表（幂等，得票数从 0 累计）
  for (const g of FEATURE_VOTE_GROUPS) {
    for (const item of g.items) {
      await sql`
        insert into feature_votes (id, category, name, votes)
        values (${item.id}, ${g.title}, ${item.name}, 0)
        on conflict (id) do nothing`;
    }
  }
}

async function currentUid(req: NextRequest): Promise<string | null> {
  const token = extractToken(req.headers.get("cookie"));
  if (!token) return null;
  const user = await verifyToken(token);
  return user?.uid ?? null;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function GET(req: NextRequest) {
  const guard = guardRequest(req, "featureVote");
  if (!guard.ok) return guardJson(guard.message, guard.status);

  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);
  await ensureSchema();

  const uid = await currentUid(req);
  const voterKey = uid ? `u:${uid}` : `ip:${clientIp(req)}`;

  const rows = await sql`select id, votes from feature_votes`;
  const votes: Record<string, number> = {};
  for (const r of rows) votes[r.id] = Number(r.votes) || 0;

  const log = await sql`select 1 from feature_vote_log where voter_key = ${voterKey}`;
  const voted = log.length > 0;

  return json(
    {
      ok: true,
      max: FEATURE_VOTE_MAX,
      groups: FEATURE_VOTE_GROUPS,
      votes,
      voted,
    },
    200
  );
}

export async function POST(req: NextRequest) {
  const guard = guardRequest(req, "featureVote");
  if (!guard.ok) return guardJson(guard.message, guard.status);

  if (!sql) return json({ ok: false, error: "数据库未配置" }, 503);

  let body: { featureIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "请求体不是合法 JSON" }, 400);
  }

  const featureIds = Array.isArray(body.featureIds)
    ? body.featureIds.filter((x): x is string => typeof x === "string")
    : [];
  const ids = featureIds
    .map((s) => s.trim())
    .filter((s) => isValidFeatureId(s))
    .slice(0, FEATURE_VOTE_MAX);

  if (ids.length === 0) {
    return json({ ok: false, error: "请至少选择一个你想要的机器人功能" }, 400);
  }

  const uid = await currentUid(req);
  const voterKey = uid ? `u:${uid}` : `ip:${clientIp(req)}`;

  // 每人（账号 / IP）只投一次
  const exists =
    await sql`select 1 from feature_vote_log where voter_key = ${voterKey}`;
  if (exists.length > 0) {
    return json({ ok: false, error: "你已经投过票了，感谢参与" }, 409);
  }

  try {
    await sql.begin(async (tx) => {
      await tx`insert into feature_vote_log (voter_key) values (${voterKey})`;
      for (const id of ids) {
        await tx`
          update feature_votes set votes = votes + 1 where id = ${id}`;
      }
    });
  } catch {
    // unique 冲突：并发重复提交
    return json({ ok: false, error: "你已经投过票了，感谢参与" }, 409);
  }

  const rows = await sql`select id, votes from feature_votes where id = any(${ids})`;
  const votes: Record<string, number> = {};
  for (const r of rows) votes[r.id] = Number(r.votes) || 0;

  return json({ ok: true, voted: true, votes }, 200);
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
