"use client";

import { useState } from "react";
import { MODELS, MODEL_MAP } from "@/lib/models";
import { BENCHMARK_TASKS } from "@/lib/benchmarks";
import { scoreAnswer, scoreGrade, type ScoreBreakdown } from "@/lib/scoring";
import { buildDemoAnswer, demoLatency } from "@/lib/demo";
import { setBenchRecord } from "@/lib/store";
import Markdown from "./Markdown";

interface ResultItem {
  taskId: string;
  taskTitle: string;
  taskIcon: string;
  taskCategory: string;
  model: string;
  modelName: string;
  color: string;
  text: string;
  error: string | null;
  latencyMs: number;
  score: ScoreBreakdown | null;
}

interface SummaryItem {
  model: string;
  modelName: string;
  color: string;
  avg: number;
  grade: string;
  gradeColor: string;
  done: number;
  total: number;
  best: { taskTitle: string; score: number } | null;
}

function buildSummary(
  results: ResultItem[],
  totalTasks: number
): SummaryItem[] {
  const modelIds = [...new Set(results.map((r) => r.model))];
  const summary = modelIds.map((id) => {
    const mine = results.filter((r) => r.model === id && !r.error);
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
      model: id,
      modelName: mine[0]?.modelName ?? id,
      color: mine[0]?.color ?? "#22D3EE",
      avg,
      grade: grade.label,
      gradeColor: grade.color,
      done: mine.length,
      total: totalTasks,
      best,
    };
  });
  summary.sort((a, b) => b.avg - a.avg);
  return summary;
}

export default function BenchmarkSection() {
  const [models, setModels] = useState<Set<string>>(
    () => new Set(["deepseek", "doubao", "qwen"])
  );
  const [demo, setDemo] = useState(true);
  const [tasks, setTasks] = useState<Set<string>>(
    () => new Set(BENCHMARK_TASKS.map((t) => t.id))
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [summary, setSummary] = useState<SummaryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });

  const run = async () => {
    if (models.size === 0) return setError("请至少勾选一个模型。");
    if (tasks.size === 0) return setError("请至少勾选一道评测题。");
    setError(null);
    setRunning(true);
    setResults(null);
    setSummary(null);
    setExpanded({});

    // 演示模式：本地模拟回答 + 客户端评分
    if (demo) {
      await new Promise((r) => setTimeout(r, 1200)); // 模拟“跑评测”耗时
      const modelList = [...models]
        .map((id) => MODEL_MAP[id])
        .filter(Boolean);
      const taskList = [...tasks]
        .map((id) => BENCHMARK_TASKS.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));
      const items: ResultItem[] = [];
      for (const task of taskList) {
        for (const model of modelList) {
          const text = buildDemoAnswer(model, task.prompt);
          items.push({
            taskId: task.id,
            taskTitle: task.title,
            taskIcon: task.icon,
            taskCategory: task.category,
            model: model.id,
            modelName: model.name,
            color: model.color,
            text,
            error: null,
            latencyMs: demoLatency(model.id),
            score: scoreAnswer(task, text),
          });
        }
      }
      setResults(items);
      const s = buildSummary(items, taskList.length);
      setSummary(s);
      setBenchRecord({
        summary: s.map((x) => ({
          model: x.model,
          modelName: x.modelName,
          avg: x.avg,
          grade: x.grade,
        })),
        taskCount: taskList.length,
        finishedAt: Date.now(),
      });
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ models: [...models], tasks: [...tasks] }),
      });
      if (!res.ok) {
        let msg = `请求失败 HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setResults(data.results);
      setSummary(data.summary);
      if (Array.isArray(data.summary)) {
        setBenchRecord({
          summary: data.summary.map((x: SummaryItem) => ({
            model: x.model,
            modelName: x.modelName,
            avg: x.avg,
            grade: x.grade,
          })),
          taskCount: Number(data.taskCount ?? 0),
          finishedAt: Date.now(),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const taskById = (id: string) => BENCHMARK_TASKS.find((t) => t.id === id);

  return (
    <section id="benchmark" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ② 具身智能专项评测
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            用标准化具身任务（规划 / 代码 / 视觉 / 容错 / 安全）批量压测选中的模型，自动评分 + 排序推荐。
            评分基于关键词与结构启发式，<span className="text-amber-400">仅供参考，选型请结合人工评审</span>。
          </p>
        </div>

        <div className="panel p-4">
          {/* 模型选择 */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-200">评测模型</span>
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => setModels(new Set(MODELS.map((m) => m.id)))}
                  className="text-accent-soft hover:underline"
                >
                  全选
                </button>
                <button
                  onClick={() => setModels(new Set(MODELS.filter((m) => m.category === "国产").map((m) => m.id)))}
                  className="text-accent-soft hover:underline"
                >
                  国产
                </button>
                <button onClick={() => setModels(new Set())} className="text-slate-500 hover:underline">
                  清空
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(setModels)(m.id)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition ${
                    models.has(m.id)
                      ? "border-accent/50 bg-accent/10 text-accent-soft"
                      : "border-bg-border text-slate-500 hover:border-slate-600"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* 题目选择 */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-200">评测题目</span>
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => setTasks(new Set(BENCHMARK_TASKS.map((t) => t.id)))}
                  className="text-accent-soft hover:underline"
                >
                  全选
                </button>
                <button onClick={() => setTasks(new Set())} className="text-slate-500 hover:underline">
                  清空
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BENCHMARK_TASKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggle(setTasks)(t.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    tasks.has(t.id)
                      ? "border-accent/50 bg-accent/8"
                      : "border-bg-border hover:border-slate-600"
                  }`}
                >
                  <div className="text-[13px] font-medium text-slate-200">
                    {t.icon} {t.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {t.category} · {t.prompt.slice(0, 46)}…
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bg-border pt-3">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                  className="h-3.5 w-3.5 accent-cyan-400"
                />
                <span className="text-[12px] text-amber-300">演示模式（本地模拟）</span>
              </label>
              <span className="text-[12px] text-slate-600">
                {models.size} 模型 × {tasks.size} 题
                {!demo && ` · 约 ${models.size * tasks.size * 15} 秒`}
              </span>
            </div>
            <button
              onClick={run}
              disabled={running}
              className={`rounded-lg px-6 py-2.5 text-[13px] font-semibold transition ${
                running
                  ? "cursor-not-allowed bg-slate-800 text-slate-500"
                  : "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
              }`}
            >
              {running ? "评测运行中…" : "🚀 一键跑评测"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-neon-red/30 bg-neon-red/10 p-3 text-[13px] text-neon-red">
            {error}
          </div>
        )}

        {/* 汇总排行 */}
        {summary && (
          <div className="mt-6">
            <h3 className="mb-3 text-[15px] font-semibold text-slate-200">
              模型排行（自动评分 · 满分 100）
            </h3>
            <div className="panel overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-bg-border bg-slate-800/40 text-left text-slate-400">
                    <th className="px-4 py-2.5 font-medium">排名</th>
                    <th className="px-4 py-2.5 font-medium">模型</th>
                    <th className="px-4 py-2.5 font-medium">平均分</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">最高分项</th>
                    <th className="px-4 py-2.5 font-medium">完成度</th>
                    <th className="px-4 py-2.5 font-medium">评级</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, i) => (
                    <tr
                      key={s.model}
                      className={`border-b border-bg-border/60 last:border-0 ${
                        i === 0 ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="text-accent">🥇</span>
                        ) : i === 1 ? (
                          <span>🥈</span>
                        ) : i === 2 ? (
                          <span>🥉</span>
                        ) : (
                          <span className="text-slate-600">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium text-slate-200">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.modelName}
                          {i === 0 && (
                            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent-soft">
                              推荐
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{s.avg}</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.avg}%`, backgroundColor: s.gradeColor }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">
                        {s.best ? `${s.best.taskTitle}（${s.best.score}）` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {s.done}/{s.total}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px]"
                          style={{ color: s.gradeColor, backgroundColor: `${s.gradeColor}1f` }}
                        >
                          {s.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 逐题结果 */}
            <h3 className="mb-3 mt-8 text-[15px] font-semibold text-slate-200">逐题详情</h3>
            <div className="space-y-4">
              {BENCHMARK_TASKS.filter((t) => tasks.has(t.id)).map((t) => {
                const items = (results ?? []).filter((r) => r.taskId === t.id);
                const open = expanded[t.id] ?? false;
                return (
                  <div key={t.id} className="panel overflow-hidden">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }))}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-800/30"
                    >
                      <span className="text-[14px] font-medium text-slate-200">
                        {t.icon} {t.title}
                        <span className="ml-2 rounded bg-slate-800/70 px-1.5 py-0.5 text-[11px] text-slate-500">
                          {t.category}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-[12px] text-slate-500">
                        <span className="hidden items-center gap-2 sm:flex">
                          {items.map((r) => (
                            <span key={r.model} style={{ color: r.color }}>
                              {r.score ? r.score.total : "✕"}
                            </span>
                          ))}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>

                    {open && (
                      <div className="border-t border-bg-border">
                        <div className="bg-slate-800/20 px-4 py-2 text-[12px] text-slate-500">
                          评测标准：{t.rubric.join(" ｜ ")}
                        </div>
                        <div className="grid gap-3 p-4 md:grid-cols-2">
                          {items.map((r) => (
                            <div
                              key={r.model}
                              className="rounded-xl border border-bg-border bg-bg-soft/30 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-[13px] font-medium text-slate-200">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: r.color }}
                                  />
                                  {r.modelName}
                                </span>
                                {r.score ? (
                                  <span className="text-[12px] text-slate-400">
                                    评分 <b style={{ color: r.color }}>{r.score.total}</b>
                                    <span className="text-slate-600">
                                      {" "}
                                      (词{r.score.keyword} 构{r.score.structure} 篇{r.score.length} 质
                                      {r.score.quality})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-neon-red">失败</span>
                                )}
                              </div>
                              {r.error ? (
                                <div className="text-[12px] text-neon-red">{r.error}</div>
                              ) : (
                                <div className="max-h-72 overflow-y-auto pr-1">
                                  <Markdown text={r.text} />
                                </div>
                              )}
                              <div className="mt-2 text-right text-[11px] text-slate-600">
                                {r.latencyMs}ms
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
