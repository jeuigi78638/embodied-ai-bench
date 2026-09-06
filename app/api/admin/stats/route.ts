import { NextRequest, NextResponse } from "next/server";
import { sql, isDbReady } from "@/lib/db";
import { extractAdminToken, verifyAdminToken } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrendRow {
  d: string;
  n: number;
}

export async function GET(req: NextRequest) {
  // 1) 管理会话校验
  const token = extractAdminToken(req.headers.get("cookie"));
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  if (!isDbReady() || !sql) {
    return NextResponse.json(
      { error: "数据库未配置（DATABASE_URL）" },
      { status: 503 }
    );
  }

  try {
    // 2) 总量
    const [u, r, p, v] = await Promise.all([
      sql`select count(*)::int as n from users`,
      sql`select count(*)::int as n from robots`,
      sql`select count(*)::int as n from posts`,
      sql`select count(*)::int as n from votes`,
    ]);

    // 3) 近 7 天注册趋势（数据库侧按 UTC 日期分组）
    const trendRows = (await sql`
      select to_char(created_at, 'YYYY-MM-DD') as d, count(*)::int as n
      from users
      where created_at >= now() - interval '7 days'
      group by d order by d
    `) as TrendRow[];

    // 4) 最新注册用户
    const latestUsers = await sql`
      select email, nickname, created_at
      from users order by created_at desc limit 5
    `;

    // 5) 最新帖子
    const latestPosts = await sql`
      select id, title, author, category, created_at
      from posts order by created_at desc limit 5
    `;

    // 6) 机器人角色分布 / 帖子分类分布 / 盲测榜单摘要
    const roles = await sql`
      select role, count(*)::int as n from robots group by role order by n desc
    `;
    const cats = await sql`
      select category, count(*)::int as n from posts group by category order by n desc
    `;
    const lbTop = await sql`
      select model, elo, matches from leaderboard order by elo desc limit 5
    `;

    // 7) 补齐 7 天序列
    const map = new Map<string, number>(
      trendRows.map((x) => [x.d, x.n])
    );
    const days: TrendRow[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const key = new Date(now.getTime() - i * 86400000)
        .toISOString()
        .slice(0, 10);
      days.push({ d: key, n: map.get(key) || 0 });
    }

    return NextResponse.json({
      counts: {
        users: u[0].n,
        robots: r[0].n,
        posts: p[0].n,
        votes: v[0].n,
      },
      trend7: days,
      latestUsers,
      latestPosts,
      roleDist: roles,
      catDist: cats,
      lbTop,
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json({ error: "统计查询失败" }, { status: 500 });
  }
}
