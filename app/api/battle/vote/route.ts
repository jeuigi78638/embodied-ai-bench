import { NextRequest, NextResponse } from "next/server";
import { sql, isDbReady } from "@/lib/db";
import { guardRequest, guardJson } from "@/lib/guard";
import { MODEL_MAP } from "@/lib/models";
import { computeElo, clampElo } from "@/lib/elo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set([
  "grasp",
  "nav",
  "ros2",
  "vlm",
  "recover",
  "safety",
  "custom",
]);

const WINNERS = new Set(["a", "b", "tie"]);

export async function POST(req: NextRequest) {
  // 1) 防护：Host / Origin 白名单 + IP 限流
  const g = guardRequest(req, "battle");
  if (!g.ok) return guardJson(g.message, g.status);

  // 2) 解析并校验参数
  let body: {
    prompt?: string;
    category?: string;
    model_a?: string;
    model_b?: string;
    winner?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return guardJson("请求体不是合法 JSON", 400);
  }

  const prompt = String(body.prompt ?? "").trim();
  const category = String(body.category ?? "custom").trim();
  const modelA = String(body.model_a ?? "").trim();
  const modelB = String(body.model_b ?? "").trim();
  const winner = String(body.winner ?? "").trim();

  if (!prompt) return guardJson("缺少对局指令（prompt）", 400);
  if (prompt.length > 3000) return guardJson("指令过长（最多 3000 字）", 400);
  if (!MODEL_MAP[modelA] || !MODEL_MAP[modelB]) {
    return guardJson("参赛模型不在支持列表内", 400);
  }
  if (modelA === modelB) return guardJson("两个参赛模型不能相同", 400);
  if (!WINNERS.has(winner)) return guardJson("winner 必须是 a / b / tie", 400);

  if (!isDbReady() || !sql) {
    return NextResponse.json(
      { error: "数据库未配置（DATABASE_URL）" },
      { status: 503 }
    );
  }

  const w = winner as "a" | "b" | "tie";

  try {
    const id = crypto.randomUUID();
    const result = await sql.begin(async (tx) => {
      // 3) 读取双方当前 Elo（新模型默认 1500）
      const [ra, rb] = await Promise.all([
        tx`select elo from leaderboard where model = ${modelA}`,
        tx`select elo from leaderboard where model = ${modelB}`,
      ]);
      const eloA = ra.length ? Number(ra[0].elo) : 1500;
      const eloB = rb.length ? Number(rb[0].elo) : 1500;

      // 4) Elo 更新
      const { deltaA, deltaB } = computeElo(eloA, eloB, w);
      const newA = clampElo(eloA + deltaA);
      const newB = clampElo(eloB + deltaB);

      // 5) upsert 排行榜（双方）
      await tx`
        insert into leaderboard (model, elo, wins, losses, ties, matches, updated_at)
        values (${modelA}, ${newA},
          ${winner === "a" ? 1 : 0}, ${winner === "b" ? 1 : 0},
          ${winner === "tie" ? 1 : 0}, 1, now())
        on conflict (model) do update set
          elo = ${newA},
          wins = leaderboard.wins + ${winner === "a" ? 1 : 0},
          losses = leaderboard.losses + ${winner === "b" ? 1 : 0},
          ties = leaderboard.ties + ${winner === "tie" ? 1 : 0},
          matches = leaderboard.matches + 1,
          updated_at = now()
      `;
      await tx`
        insert into leaderboard (model, elo, wins, losses, ties, matches, updated_at)
        values (${modelB}, ${newB},
          ${winner === "b" ? 1 : 0}, ${winner === "a" ? 1 : 0},
          ${winner === "tie" ? 1 : 0}, 1, now())
        on conflict (model) do update set
          elo = ${newB},
          wins = leaderboard.wins + ${winner === "b" ? 1 : 0},
          losses = leaderboard.losses + ${winner === "a" ? 1 : 0},
          ties = leaderboard.ties + ${winner === "tie" ? 1 : 0},
          matches = leaderboard.matches + 1,
          updated_at = now()
      `;

      // 6) 记录对局
      await tx`
        insert into votes (id, prompt, category, model_a, model_b, winner)
        values (${id}, ${prompt}, ${category}, ${modelA}, ${modelB}, ${winner})
      `;

      return { eloA: newA, eloB: newB };
    });

    return NextResponse.json({
      ok: true,
      id,
      category: CATEGORIES.has(category) ? category : "custom",
      eloA: result.eloA,
      eloB: result.eloB,
    });
  } catch (e) {
    console.error("[battle/vote]", e);
    return NextResponse.json({ error: "投票写入失败" }, { status: 500 });
  }
}
