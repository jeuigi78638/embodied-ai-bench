// ============================================================
// app/api/benchmark/route.ts — 具身专项评测
// 选中 N 个模型 × M 道评测题，并发跑各模型、逐题顺序作答，
// 返回完整回答 + 自动评分（启发式），并给出模型汇总推荐。
// Edge Runtime；请求体：{ models?: string[], tasks?: string[] }
// ============================================================

import { MODELS, MODEL_MAP, DEFAULT_SYSTEM_PROMPT } from "@/lib/models";
import { BENCHMARK_TASKS } from "@/lib/benchmarks";
import { completeModel, type ChatMessage } from "@/lib/providers";
import { scoreAnswer, scoreGrade } from "@/lib/scoring";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { models?: unknown; tasks?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "请求体不是合法 JSON" }, 400);
  }

  const modelIds = Array.isArray(body.models)
    ? body.models.filter((id): id is string => typeof id === "string")
    : [];
  const models = (modelIds.length > 0 ? modelIds : MODELS.map((m) => m.id))
    .map((id) => MODEL_MAP[id])
    .filter(Boolean);
  if (models.length === 0) {
    return json({ error: "没有可用的模型" }, 400);
  }

  const taskIds = Array.isArray(body.tasks)
    ? body.tasks.filter((id): id is string => typeof id === "string")
    : [];
  const tasks = (taskIds.length > 0 ? taskIds : BENCHMARK_TASKS.map((t) => t.id))
    .map((id) => BENCHMARK_TASKS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  // 各模型并行，逐题顺序作答
  const perModel = await Promise.all(
    models.map(async (model) => {
      const items = [];
      for (const task of tasks) {
        const messages: ChatMessage[] = [
          { role: "system", content: DEFAULT_SYSTEM_PROMPT },
          { role: "user", content: task.prompt },
        ];
        const startedAt = Date.now();
        const { text, error } = await completeModel(model, messages, {
          maxTokens: 1600,
        });
        const score = error ? null : scoreAnswer(task, text);
        items.push({
          taskId: task.id,
          taskTitle: task.title,
          taskIcon: task.icon,
          taskCategory: task.category,
          model: model.id,
          modelName: model.name,
          color: model.color,
          text,
          error,
          latencyMs: Date.now() - startedAt,
          score,
        });
      }
      return items;
    })
  );

  const results = perModel.flat();

  // 模型汇总：平均分 / 最高分项 / 覆盖度
  const summary = models.map((model) => {
    const mine = results.filter((r) => r.model === model.id && !r.error);
    const total = mine.reduce((s, r) => s + (r.score?.total ?? 0), 0);
    const avg = mine.length ? Math.round(total / mine.length) : 0;
    const best = mine.reduce<{ taskTitle: string; score: number } | null>(
      (b, r) =>
        !b || (r.score?.total ?? 0) > b.score
          ? { taskTitle: r.taskTitle, score: r.score?.total ?? 0 }
          : b,
      null
    );
    const grade = scoreGrade(avg);
    return {
      model: model.id,
      modelName: model.name,
      color: model.color,
      avg,
      grade: grade.label,
      gradeColor: grade.color,
      done: mine.length,
      total: tasks.length,
      best,
    };
  });

  summary.sort((a, b) => b.avg - a.avg);

  return json({ results, summary, taskCount: tasks.length }, 200);
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
