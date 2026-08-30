"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MODELS,
  MODEL_MAP,
  DEFAULT_SYSTEM_PROMPT,
  SAFETY_PROMPT_TEMPLATE,
  TASK_TEMPLATES,
  QUICK_EXAMPLES,
} from "@/lib/models";
import ModelCard, { type CardState } from "./ModelCard";
import { streamDemo } from "@/lib/demo";
import { setCompareRecord } from "@/lib/store";

type Filter = "all" | "国产" | "国际";

const emptyCard: CardState = { text: "", status: "idle" };

export default function CompareWorkbench() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["doubao", "deepseek", "qwen"])
  );
  const [demo, setDemo] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [useSafety, setUseSafety] = useState(true);
  const [showSystem, setShowSystem] = useState(false);
  const [results, setResults] = useState<Record<string, CardState>>({});
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // 镜像 results，供 run 完成后写入共享 store（选型报告引用）
  const resultsRef = useRef<Record<string, CardState>>({});
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const visibleModels = useMemo(
    () => MODELS.filter((m) => filter === "all" || m.category === filter),
    [filter]
  );

  const finalSystem = useSafety
    ? `${SAFETY_PROMPT_TEMPLATE}\n\n${systemPrompt}`
    : systemPrompt;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleModels.forEach((m) => next.add(m.id));
      return next;
    });
  const clearSelected = () => setSelected(new Set());
  const selectChinese = () =>
    setSelected(new Set(MODELS.filter((m) => m.category === "国产").map((m) => m.id)));

  const applyTemplate = (id: string) => {
    const t = TASK_TEMPLATES.find((x) => x.id === id);
    if (t) setPrompt(t.prompt);
  };

  const handleRun = async () => {
    if (!prompt.trim()) {
      alert("请先输入任务指令，或从任务模板/快捷示例中选择一个。");
      return;
    }
    if (selected.size === 0) {
      alert("请至少勾选一个模型。");
      return;
    }

    setRunning(true);
    setResults((prev) => {
      const next: Record<string, CardState> = {};
      for (const id of selected) {
        next[id] = prev[id] && prev[id].status === "streaming"
          ? prev[id]
          : { text: "", status: "streaming" };
      }
      return next;
    });

    // 演示模式：本地模拟流式（不调用 API）
    if (demo) {
      const tasks = [...selected]
        .map((id) => MODEL_MAP[id])
        .filter(Boolean)
        .map((config) =>
          (async () => {
            try {
              for await (const chunk of streamDemo(config, prompt)) {
                setResults((prev) => ({
                  ...prev,
                  [config.id]: {
                    text: (prev[config.id]?.text ?? "") + chunk,
                    status: "streaming",
                  },
                }));
              }
            } catch {
              setResults((prev) => ({
                ...prev,
                [config.id]: {
                  text: prev[config.id]?.text ?? "",
                  status: "error",
                  error: "演示模式生成失败",
                },
              }));
            } finally {
              setResults((prev) => {
                const cur = prev[config.id];
                return {
                  ...prev,
                  [config.id]: {
                    ...(cur ?? { text: "", status: "idle" }),
                    status:
                      cur?.status === "error" ? "error" : "done",
                  },
                };
              });
            }
          })()
        );
      await Promise.all(tasks);
      setCompareRecord({
        prompt: prompt.trim(),
        results: resultsRef.current,
        finishedAt: Date.now(),
      });
      setRunning(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: prompt.trim(),
          systemPrompt: finalSystem,
          models: [...selected],
        }),
      });

      if (!res.ok || !res.body) {
        let msg = `请求失败 HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith("data:")) continue;
          const data = raw.slice(5).trim();
          if (!data) continue;
          try {
            const ev = JSON.parse(data);
            setResults((prev) => {
              if (!ev?.model) return prev;
              const cur = prev[ev.model] ?? { ...emptyCard, status: "streaming" as const };
              if (ev.error) {
                return { ...prev, [ev.model]: { ...cur, status: "error", error: ev.error } };
              }
              if (ev.done) {
                return {
                  ...prev,
                  [ev.model]: {
                    ...cur,
                    status: cur.status === "error" ? "error" : "done",
                  },
                };
              }
              if (typeof ev.delta === "string" && ev.delta.length) {
                return { ...prev, [ev.model]: { ...cur, text: cur.text + ev.delta } };
              }
              return prev;
            });
          } catch {
            /* ignore malformed */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setResults((prev) => {
          const next = { ...prev };
          for (const id of selected) {
            next[id] = {
              text: next[id]?.text ?? "",
              status: "error",
              error: e instanceof Error ? e.message : String(e),
            };
          }
          return next;
        });
      }
    } finally {
      setCompareRecord({
        prompt: prompt.trim(),
        results: resultsRef.current,
        finishedAt: Date.now(),
      });
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const clearAll = () => setResults({});

  return (
    <section id="workbench" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ① 多模型实时对比工作台
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            一个指令，7 个模型并发流式作答。对比机器人任务规划 / 代码 / 安全约束，谁强谁弱一目了然。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* 左侧：模型选择 */}
          <div className="panel h-fit p-4 lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-200">选择模型</span>
              <span className="text-[11px] text-accent-soft">{selected.size}/7</span>
            </div>

            <div className="mb-3 flex gap-1">
              {(["all", "国产", "国际"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] transition ${
                    filter === f
                      ? "bg-accent/15 text-accent-soft ring-1 ring-accent/40"
                      : "text-slate-500 hover:bg-slate-800/60"
                  }`}
                >
                  {f === "all" ? "全部" : f}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {visibleModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected.has(m.id)
                      ? "border-accent/40 bg-accent/8"
                      : "border-bg-border bg-bg-soft/40 hover:border-slate-600"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] transition ${
                      selected.has(m.id)
                        ? "border-accent bg-accent text-black"
                        : "border-slate-600"
                    }`}
                  >
                    {selected.has(m.id) ? "✓" : ""}
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium text-slate-200">
                      {m.name}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {m.vendor} · {m.category}
                    </span>
                  </span>
                  {m.supportsVision && (
                    <span className="rounded bg-accent/15 px-1 text-[10px] text-accent-soft">VLM</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-1.5">
              <button
                onClick={selectAllVisible}
                className="flex-1 rounded-lg border border-bg-border px-2 py-1.5 text-[12px] text-slate-400 transition hover:border-accent/40 hover:text-accent-soft"
              >
                全选
              </button>
              <button
                onClick={selectChinese}
                className="flex-1 rounded-lg border border-bg-border px-2 py-1.5 text-[12px] text-slate-400 transition hover:border-accent/40 hover:text-accent-soft"
              >
                国产优先
              </button>
              <button
                onClick={clearSelected}
                className="flex-1 rounded-lg border border-bg-border px-2 py-1.5 text-[12px] text-slate-500 transition hover:border-neon-red/40 hover:text-neon-red"
              >
                清空
              </button>
            </div>
          </div>

          {/* 右侧：输入 + 结果 */}
          <div className="space-y-4">
            {/* 任务模板 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-slate-500">具身任务模板：</span>
              {TASK_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-full border border-bg-border bg-bg-card/60 px-3 py-1 text-[12px] text-slate-400 transition hover:border-accent/40 hover:text-accent-soft"
                  title={t.prompt}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 系统提示词 */}
            <div className="panel p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSystem((v) => !v)}
                    className="flex items-center gap-1 text-[13px] font-medium text-slate-300 transition hover:text-accent-soft"
                  >
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition ${showSystem ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    系统提示词
                  </button>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={useSafety}
                      onChange={(e) => setUseSafety(e.target.checked)}
                      className="h-3.5 w-3.5 accent-cyan-400"
                    />
                    <span className="text-[12px] text-neon-green">具身安全约束</span>
                  </label>
                </div>
                <button
                  onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                  className="text-[11px] text-slate-600 transition hover:text-accent-soft"
                >
                  恢复默认
                </button>
              </div>
              {showSystem && (
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="mt-3 w-full resize-y rounded-xl border border-bg-border bg-black/30 p-3 text-[12.5px] leading-relaxed text-slate-300 outline-none transition focus:border-accent/50"
                />
              )}
            </div>

            {/* 输入区 */}
            <div className="panel p-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="输入要给 7 个模型对比的具身任务指令，例如：给我一份机械臂抓取红色马克杯的分步规划……"
                className="w-full resize-y rounded-xl border border-bg-border bg-black/30 p-3.5 text-[14px] leading-relaxed text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-600">快捷示例：</span>
                {QUICK_EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setPrompt(q)}
                    className="rounded-full border border-bg-border px-2.5 py-0.5 text-[11px] text-slate-500 transition hover:border-accent/40 hover:text-accent-soft"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={demo}
                      onChange={(e) => setDemo(e.target.checked)}
                      className="h-3.5 w-3.5 accent-cyan-400"
                    />
                    <span className="text-[12px] text-amber-300">演示模式（无 Key）</span>
                  </label>
                  <span className="text-[11px] text-slate-600">
                    {prompt.length} 字 · 已选 {selected.size} 个模型
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearAll}
                    className="rounded-lg border border-bg-border px-3.5 py-2 text-[13px] text-slate-500 transition hover:border-neon-red/40 hover:text-neon-red"
                  >
                    清空结果
                  </button>
                  {running ? (
                    <button
                      onClick={handleStop}
                      className="rounded-lg border border-neon-red/50 bg-neon-red/15 px-5 py-2 text-[13px] font-semibold text-neon-red transition hover:bg-neon-red/25"
                    >
                      ■ 停止
                    </button>
                  ) : (
                    <button
                      onClick={handleRun}
                      className="rounded-lg bg-accent px-5 py-2 text-[13px] font-semibold text-black shadow-glow-sm transition hover:bg-accent-soft"
                    >
                      ⚡ 开始对比
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 演示模式提示 */}
            {demo && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 text-[12px] leading-relaxed text-amber-300">
                🎮 当前为<strong>演示模式</strong>：回答由本地模拟生成，用于预览界面与完整流程。
                在 <code className="rounded bg-black/40 px-1 font-mono">.env.local</code> 或 Vercel 环境变量中配置任一模型的
                API Key 后，取消勾选「演示模式」即可切换为真实模型并发输出。
              </div>
            )}

            {/* 结果网格 */}
            <div className="grid gap-4 md:grid-cols-2">
              {[...selected]
                .map((id) => MODEL_MAP[id])
                .filter(Boolean)
                .map((config) => (
                  <ModelCard
                    key={config.id}
                    config={config}
                    state={results[config.id] ?? emptyCard}
                    onClear={(id) =>
                      setResults((prev) => ({ ...prev, [id]: { ...emptyCard } }))
                    }
                  />
                ))}
            </div>
            {selected.size === 0 && (
              <div className="panel p-8 text-center text-[13px] text-slate-500">
                请先在左侧勾选至少一个模型。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
