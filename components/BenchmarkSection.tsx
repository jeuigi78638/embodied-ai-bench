"use client";

import { useEffect, useState } from "react";
import { MODELS, MODEL_MAP } from "@/lib/models";
import { BENCHMARK_TASKS } from "@/lib/benchmarks";
import { scoreGrade, scoreAnswer } from "@/lib/scoring";
import { buildDemoAnswer, demoLatency } from "@/lib/demo";
import { setBenchRecord } from "@/lib/store";
import Markdown from "./Markdown";

interface AnswerItem {
  model: string;
  modelName: string;
  color: string;
  text: string;
  error: string | null;
  latencyMs: number;
}

const DIMENSIONS = [
  { id: "exec", label: "可执行性", hint: "能直接照着做" },
  { id: "safety", label: "安全性", hint: "有安全约束" },
  { id: "complete", label: "完整性", hint: "覆盖全流程" },
  { id: "relevance", label: "贴题度", hint: "答到点上" },
] as const;

type DimId = (typeof DIMENSIONS)[number]["id"];

function dimScore(total: number): { label: string; color: string } {
  if (total >= 85) return { label: "强", color: "#34D399" };
  if (total >= 65) return { label: "良", color: "#22D3EE" };
  if (total >= 40) return { label: "一般", color: "#FBBF24" };
  return { label: "弱", color: "#F87171" };
}

export default function BenchmarkSection() {
  const [prompt, setPrompt] = useState(BENCHMARK_TASKS[0].prompt);
  const [models, setModels] = useState<Set<string>>(
    () => new Set(["deepseek", "doubao", "qwen"])
  );
  const [demo, setDemo] = useState(true);
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<AnswerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [showRef, setShowRef] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleModel = (id: string) =>
    setModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const useTemplate = (t: (typeof BENCHMARK_TASKS)[number]) => {
    setPrompt(t.prompt);
    setAnswers(null);
    setScores({});
    setError(null);
  };

  const run = async () => {
    if (!prompt.trim()) return setError("请先描述你的机器人任务（①）。");
    if (models.size === 0) return setError("请至少选择一个模型（②）。");
    setError(null);
    setRunning(true);
    setAnswers(null);
    setScores({});
    setExpanded({});

    if (demo) {
      await new Promise((r) => setTimeout(r, 1100));
      const items: AnswerItem[] = [...models]
        .map((id) => MODEL_MAP[id])
        .filter(Boolean)
        .map((m) => ({
          model: m.id,
          modelName: m.name,
          color: m.color,
          text: buildDemoAnswer(m, prompt),
          error: null,
          latencyMs: demoLatency(m.id),
        }));
      setAnswers(items);
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ models: [...models], prompt }),
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
      const items = Array.isArray(data.results)
        ? data.results.map(
            (r: {
              model?: string;
              modelName?: string;
              color?: string;
              text?: string;
              error?: string;
              latencyMs?: number;
            }) => ({
              model: r.model ?? "",
              modelName: r.modelName ?? r.model ?? "",
              color: r.color ?? "#22D3EE",
              text: r.text ?? "",
              error: r.error ?? null,
              latencyMs: r.latencyMs ?? 0,
            })
          )
        : [];
      setAnswers(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const setScore = (model: string, dim: DimId, val: number) => {
    setScores((prev) => ({
      ...prev,
      [model]: { ...(prev[model] ?? {}), [dim]: val },
    }));
  };

  const rated = answers
    ? answers
        .filter((a) => !a.error)
        .map((a) => {
          const s = scores[a.model] ?? {};
          const dims = DIMENSIONS.map((d) => s[d.id] ?? 0);
          const total = dims.reduce((x, y) => x + y, 0);
          const pct = Math.round((total / (DIMENSIONS.length * 5)) * 100);
          return { ...a, dims, total, pct, rated: total > 0 };
        })
    : null;

  const anyRated = rated ? rated.some((r) => r.rated) : false;

  // 打分后同步到「选型决策助手」的实测证据
  useEffect(() => {
    if (!rated || !anyRated) return;
    const list = rated
      .filter((r) => r.rated)
      .map((r) => {
        const grade = scoreGrade(r.pct);
        return { model: r.model, modelName: r.modelName, avg: r.pct, grade: grade.label };
      })
      .sort((a, b) => b.avg - a.avg);
    if (list.length) {
      setBenchRecord({ summary: list, taskCount: 1, finishedAt: Date.now() });
    }
  }, [scores]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoredCount = anyRated ? rated!.filter((r) => r.rated).length : 0;

  return (
    <section id="benchmark" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ② 自助测评工作台
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            自己出任务、自己打分、自己得结论。系统只负责展示回答原文并汇总你的评分，
            <span className="text-amber-400">不替你下结论</span>——真正的选型判断交给你。
          </p>
        </div>

        <div className="panel p-4">
          {/* ① 自定义任务 */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-200">
                ① 自定义任务{" "}
                <span className="font-normal text-slate-500">
                  （描述你的真实机器人场景）
                </span>
              </span>
              <span className="text-[11px] text-slate-600">或用下方模板一键填入</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setAnswers(null);
                setScores({});
              }}
              rows={3}
              className="w-full resize-y rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
              placeholder="例：我的移动机器人在实验室走廊导航，遇到行人该如何处理？请对比各家方案…"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BENCHMARK_TASKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => useTemplate(t)}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${
                    prompt === t.prompt
                      ? "border-accent/50 bg-accent/10 text-accent-soft"
                      : "border-bg-border text-slate-500 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  {t.icon} {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* ② 选择模型 */}
          <div className="mb-4 border-t border-bg-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-200">
                ② 选择模型
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => setModels(new Set(MODELS.map((m) => m.id)))}
                  className="text-accent-soft hover:underline"
                >
                  全选
                </button>
                <button
                  onClick={() =>
                    setModels(
                      new Set(
                        MODELS.filter((m) => m.category === "国产").map(
                          (m) => m.id
                        )
                      )
                    )
                  }
                  className="text-accent-soft hover:underline"
                >
                  国产
                </button>
                <button
                  onClick={() => setModels(new Set())}
                  className="text-slate-500 hover:underline"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
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

          {/* ③ 运行 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bg-border pt-4">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                  className="h-3.5 w-3.5 accent-cyan-400"
                />
                <span className="text-[12px] text-amber-300">
                  演示模式（本地模拟）
                </span>
              </label>
              <span className="text-[12px] text-slate-600">
                {models.size} 个模型将回答你的任务
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
              {running ? "生成回答中…" : "🚀 生成对比回答"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-neon-red/30 bg-neon-red/10 p-3 text-[13px] text-neon-red">
            {error}
          </div>
        )}

        {/* 回答对比区 */}
        {answers && (
          <div className="mt-6">
            <h3 className="mb-3 text-[15px] font-semibold text-slate-200">
              ✔ 模型回答原文{" "}
              <span className="ml-1 text-[12px] font-normal text-slate-500">
                ——自己看，别轻信任何人
              </span>
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {answers.map((a) => {
                const open = expanded[a.model] ?? false;
                return (
                  <div key={a.model} className="panel overflow-hidden">
                    <div className="flex items-center justify-between border-b border-bg-border/70 px-3 py-2">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-slate-200">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: a.color }}
                        />
                        {a.modelName}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {a.latencyMs}ms
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      {a.error ? (
                        <div className="text-[12px] text-neon-red">
                          {a.error}
                        </div>
                      ) : (
                        <div className={`${open ? "" : "max-h-52 overflow-hidden"}`}>
                          <Markdown text={a.text} />
                        </div>
                      )}
                    </div>
                    {!a.error && (
                      <div className="border-t border-bg-border/60 px-3 py-1.5">
                        <button
                          onClick={() =>
                            setExpanded((p) => ({ ...p, [a.model]: !p[a.model] }))
                          }
                          className="text-[11.5px] text-accent-soft hover:underline"
                        >
                          {open ? "收起 ↑" : "展开全文 ↓"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ④ 手动评分 */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-slate-200">
                  ④ 你的手动评分{" "}
                  <span className="ml-1 text-[12px] font-normal text-slate-500">
                    （1-5 分，按你的判断打分）
                  </span>
                </h3>
                <button
                  onClick={() => setShowRef((v) => !v)}
                  className="text-[11.5px] text-slate-500 hover:text-accent-soft"
                >
                  {showRef ? "隐藏" : "查看"}系统参考分
                </button>
              </div>

              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[680px] text-[13px]">
                  <thead>
                    <tr className="border-b border-bg-border bg-slate-800/40 text-left text-slate-400">
                      <th className="px-4 py-2.5 font-medium">模型</th>
                      {DIMENSIONS.map((d) => (
                        <th key={d.id} className="px-2 py-2.5 text-center font-medium">
                          {d.label}
                          <div className="text-[10px] font-normal text-slate-600">
                            {d.hint}
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-center font-medium">得分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers
                      .filter((a) => !a.error)
                      .map((a) => {
                        const s = scores[a.model] ?? {};
                        const total = DIMENSIONS.reduce(
                          (x, d) => x + (s[d.id] ?? 0),
                          0
                        );
                        const pct = Math.round(
                          (total / (DIMENSIONS.length * 5)) * 100
                        );
                        const g = dimScore(pct);
                        return (
                          <tr
                            key={a.model}
                            className="border-b border-bg-border/50 last:border-0"
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-2 font-medium text-slate-200">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: a.color }}
                                />
                                {a.modelName}
                              </span>
                            </td>
                            {DIMENSIONS.map((d) => {
                              const v = s[d.id] ?? 0;
                              return (
                                <td key={d.id} className="px-2 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <button
                                        key={n}
                                        onClick={() =>
                                          setScore(a.model, d.id, v === n ? 0 : n)
                                        }
                                        className={`h-6 w-6 rounded-md text-[12px] transition ${
                                          v === n
                                            ? "bg-accent font-bold text-black"
                                            : "bg-slate-800/60 text-slate-500 hover:bg-slate-700"
                                        }`}
                                        title={`${d.label} ${n} 分`}
                                      >
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center">
                              <span className="font-semibold text-slate-100">
                                {total}
                              </span>
                              <span className="text-slate-600"> /20</span>
                              {total > 0 && (
                                <span
                                  className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]"
                                  style={{
                                    color: g.color,
                                    backgroundColor: `${g.color}1f`,
                                  }}
                                >
                                  {g.label}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* 系统参考分（折叠） */}
              {showRef && (
                <div className="mt-3 rounded-xl border border-bg-border bg-bg-soft/30 p-3 text-[12px] text-slate-500">
                  <span className="text-amber-400">系统参考分（启发式）</span>
                  ：仅供参考，不代表你的结论。
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {answers
                      .filter((a) => !a.error)
                      .map((a) => {
                        const task = BENCHMARK_TASKS.find(
                          (t) => t.prompt === prompt
                        );
                        const sc = task ? scoreAnswer(task, a.text).total : 0;
                        return (
                          <div
                            key={a.model}
                            className="rounded-lg border border-bg-border/60 px-2.5 py-1.5"
                          >
                            <span className="mr-1.5 text-slate-400">
                              {a.modelName}
                            </span>
                            <span className="text-slate-200">{sc}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 你的评分汇总 */}
              {scoredCount > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3 text-[15px] font-semibold text-slate-200">
                    你的评分汇总{" "}
                    <span className="ml-1 text-[12px] font-normal text-slate-500">
                      （已评 {scoredCount} 个模型 · 结论由你下）
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {rated!
                      .filter((r) => r.rated)
                      .sort((a, b) => b.pct - a.pct)
                      .map((r, i) => {
                        const g = dimScore(r.pct);
                        return (
                          <div
                            key={r.model}
                            className="panel flex items-center gap-3 px-4 py-3"
                          >
                            <span className="w-6 text-center text-[15px] font-bold text-slate-600">
                              {i + 1}
                            </span>
                            <span className="flex w-28 items-center gap-2 text-[13px] font-medium text-slate-200">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: r.color }}
                              />
                              <span className="truncate">{r.modelName}</span>
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${r.pct}%`, backgroundColor: g.color }}
                              />
                            </div>
                            <span className="w-16 text-right text-[13px]">
                              <b style={{ color: g.color }}>{r.pct}</b>
                              <span className="text-slate-600"> /100</span>
                            </span>
                            <span
                              className="w-14 rounded-full px-2 py-0.5 text-center text-[11px]"
                              style={{
                                color: g.color,
                                backgroundColor: `${g.color}1f`,
                              }}
                            >
                              {g.label}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <p className="mt-3 text-[11.5px] text-slate-600">
                    评分已同步到「④ 选型决策助手」。点击右上角任一维度分再次点击可取消该分。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
