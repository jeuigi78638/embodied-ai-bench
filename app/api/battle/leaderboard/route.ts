import { NextRequest, NextResponse } from "next/server";
import { sql, isDbReady } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface LeaderboardRow {
  model: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  matches: number;
  winRate: number;
}

export async function GET(req: NextRequest) {
  if (!isDbReady() || !sql) {
    return NextResponse.json(
      { error: "数据库未配置（DATABASE_URL）" },
      { status: 503 }
    );
  }

  try {
    const rows = await sql`
      select model, elo, wins, losses, ties, matches
      from leaderboard order by elo desc
    `;
    const votes = await sql`select count(*)::int as n from votes`;

    const models: LeaderboardRow[] = rows.map((r) => {
      const played = r.matches || 0;
      return {
        model: r.model,
        elo: Math.round(Number(r.elo)),
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        matches: played,
        winRate: played
          ? Math.round(((r.wins + r.ties * 0.5) / played) * 1000) / 10
          : 0,
      };
    });

    return NextResponse.json({
      models,
      totalVotes: votes[0].n,
      totalModels: models.length,
    });
  } catch (e) {
    console.error("[battle/leaderboard]", e);
    return NextResponse.json({ error: "排行榜查询失败" }, { status: 500 });
  }
}
