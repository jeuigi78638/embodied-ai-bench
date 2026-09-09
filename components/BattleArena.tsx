"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODELS, MODEL_MAP, TASK_TEMPLATES } from "@/lib/models";
import { getUserKeys } from "@/lib/userkeys";
import AiBadge from "./AiBadge";

type Step = "setup" | "running" | "voting" | "voted";

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "grasp", label: "机械臂抓取", icon: "🤖" },
  { id: "nav", label: "移动导航", icon: "🧭" },
  { id: "ros2", label: "ROS2 代码", icon: "💻" },
  { id: "vlm", label: "视觉理解", icon: "👁️" },
  { id: "recover", label: "失败恢复", icon: "🔄" },
  { id: "safety", label: "安全约束", icon: "🛡️" },
  { id: "custom", label: "自定义", icon: "✍️" },
];

interface LbRow {
  model: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  matches: number;
  winRate: number;
}

export default function BattleArena() {
  const [step, setStep] = useState<Step>("setup");
  const [model1, setModel1] = useState("gpt4o");
  const [model2, setModel2] = useState("deepseek");
  const [category, setCategory] = useState("grasp");
  const [prompt, setPrompt] = useState(TASK_TEMPLATES[0].prompt);
  const [systemPrompt, setSystemPrompt] = useState("");

  // 匿名侧映射：sideA/sideB 是用户看到的两侧，对应真实模型 id
  const [sideA, setSideA] = useState<string | null>(null);
  const [sideB, setSideB] = useState<string | null>(null);
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [doneA, setDoneA] = useState(false);
  const [doneB, setDoneB] = useState(false);
  const [error, setError] = useState("");
  const [voteMsg, setVoteMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [lb, setLb] = useState<LbRow[] | null>(null);
  const [lbVotes, setLbVotes] = useState(0);
  const [lbLoading, setLbLoading] = useState(true);

  // 排行榜加载
  const loadLb = useCallback(async () => {
    try {
      const res = await fetch("/api/battle/leaderboard");
      if (res.ok) {
        const j = await res.json();
        setLb(j.models);
        setLbVotes(j.totalVotes);
      }
    } catch {
      /* ignore */
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLb();
  }, [loadLb]);

  const pickTemplate = (id: string) => {
    const t = TASK_TEMPLATES.find((x) => x.id === id);
    if (t) {
      setPrompt(t.prompt);
      const cat = CATEGORIES.find((c) => c.id === id);
      if (cat) setCategory(id);
    }
  };

  const startBattle = async () => {
    if (!prompt.trim()) return;
    // 随机匿名分配 A/B
    const pair = Math.random() < 0.5 ? [model1, model2] : [model2, model1];
    setSideA(pair[0]);
    setSideB(pair[1]);
    setTextA("");
    setTextB("");
    setDoneA(false);
    setDoneB(false);
    setError("");
    setVoteMsg("");
    setStep("running");

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
          systemPrompt: systemPrompt.trim() || undefined,
          models: [...pair],
          userKeys: getUserKeys(),
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
            const isA = ev?.model === pair[0];
            if (ev?.error) {
              if (isA) setDoneA(true);
              else setDoneB(true);
              setError((prev) => (prev ? prev : `${MODEL_MAP[ev.model]?.name ?? ev.model} 出错了`));
              continue;
            }
            if (ev?.done) {
              if (isA) setDoneA(true);
              else setDoneB(true);
              continue;
            }
            if (typeof ev?.delta === "string" && ev.delta.length) {
              if (isA) setTextA((prev) => prev + ev.delta);
              else setTextB((prev) => prev + ev.delta);
            }
          } catch {
            /* ignore malformed */
          }
        }
      }
      setStep((prev) => (prev === "running" ? "voting" : prev));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message || "对战请求失败");
        setStep("setup");
      }
    }
  };

  const vote = async (winner: "a" | "b" | "tie") => {
    if (!sideA || !sideB || !prompt.trim()) return;
    try {
      const res = await fetch("/api/battle/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim().slice(0, 3000),
          category,
          model_a: sideA,
          model_b: sideB,
          winner,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setVoteMsg(`投票失败：${j.error || res.status}`);
        return;
      }
      const aName = MODEL_MAP[sideA]?.name ?? sideA;
      const bName = MODEL_MAP[sideB]?.name ?? sideB;
      setVoteMsg(
        `已记录！A 是 ${aName}（Elo ${j.eloA}）· B 是 ${bName}（Elo ${j.eloB}）`
      );
      setStep("voted");
      void loadLb();
    } catch {
      setVoteMsg("投票失败：网络错误");
    }
  };

  const nextRound = () => {
    setStep("setup");
    setSideA(null);
    setSideB(null);
    setVoteMsg("");
    setError("");
  };

  const bothDone = doneA && doneB;

  return (
    <section id="arena" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-6">
        <h2 className="text-[20px] font-bold text-slate-100">
          对战竞技场 <span className="ml-2 text-[12px] font-normal text-slate-500">盲测投票 · Elo 排行</span>
        </h2>
        <p className="mt-1 text-[13px] text-slate-400">
          匿名双模型对战：两个模型回答同一具身任务，你看回答投票，谁更好一目了然。
          投票数据沉淀为「具身任务 × 模型」公开排行榜。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 左侧：对战设置 */}
        <div className="panel p-5">
          <div className="text-[13px] font-semibold text-slate-200">1. 选择参赛模型</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={model1}
              onChange={(e) => setModel1(e.target.value)}
              disabled={step === "running"}
              className="rounded-lg border border-bg-border bg-soft px-2 py-2 text-[12px] text-slate-200 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === model2}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={model2}
              onChange={(e) => setModel2(e.target.value)}
              disabled={step === "running"}
              className="rounded-lg border border-bg-border bg-soft px-2 py-2 text-[12px] text-slate-200 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === model1}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">展示时随机匿名为 A / B，投票后才揭晓</p>

          <div className="mt-4 text-[13px] font-semibold text-slate-200">2. 选择任务</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickTemplate(c.id)}
                disabled={step === "running"}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  category === c.id
                    ? "border-accent bg-accent/15 text-accent-soft"
                    : "border-bg-border text-slate-400 hover:text-slate-200"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={step === "running"}
            rows={4}
            placeholder="输入具身任务指令…"
            className="mt-3 w-full rounded-lg border border-bg-border bg-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-200 outline-none transition focus:border-accent"
          />

          <button
            onClick={startBattle}
            disabled={step === "running" || !prompt.trim() || model1 === model2}
            className="mt-3 w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-50"
          >
            {step === "running" ? "对战中…" : "⚔️ 开始对战"}
          </button>
          {error && <p className="mt-2 text-[11px] text-amber-400">{error}</p>}
          {!step || (step === "setup" && voteMsg) ? (
            <p className="mt-2 text-[11px] text-slate-500">{voteMsg}</p>
          ) : null}
        </div>

        {/* 右侧：对战结果 */}
        <div className="panel p-5 lg:col-span-2">
          {step === "setup" ? (
            <div className="flex min-h-[260px] items-center justify-center text-center">
              <div>
                <div className="text-[34px]">⚔️</div>
                <p className="mt-2 text-[13px] text-slate-400">
                  选择两个模型，输入具身任务，开始盲测对战
                </p>
                {lb && lbVotes > 0 && (
                  <p className="mt-2 text-[11px] text-slate-600">
                    社区已累计 {lbVotes} 次投票
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(["a", "b"] as const).map((side) => {
                const text = side === "a" ? textA : textB;
                const done = side === "a" ? doneA : doneB;
                const modelId = side === "a" ? sideA : sideB;
                const revealed = step === "voted" && modelId;
                return (
                  <div
                    key={side}
                    className={`flex flex-col rounded-xl border p-4 ${
                      step === "voted"
                        ? "border-accent/40 bg-accent/5"
                        : "border-bg-border bg-soft/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-slate-200">
                        {step === "voted" && revealed
                          ? `${MODEL_MAP[modelId!]?.name ?? modelId}`
                          : `模型 ${side.toUpperCase()}（匿名）`}
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          done ? "bg-emerald-400" : "animate-pulse bg-amber-400"
                        }`}
                      />
                    </div>
                    <div className="mt-3 flex-1">
                      <div className="mb-1.5">
                        <AiBadge compact />
                      </div>
                      <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
                        {text || (step === "running" ? "思考中…" : "")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === "voting" && bothDone && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-bg-border/60 pt-4">
              <span className="mr-1 text-[12px] text-slate-400">你觉得哪个更好？</span>
              <button
                onClick={() => vote("a")}
                className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-accent hover:text-accent-soft"
              >
                A 更好
              </button>
              <button
                onClick={() => vote("tie")}
                className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-accent hover:text-accent-soft"
              >
                平局
              </button>
              <button
                onClick={() => vote("b")}
                className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-accent hover:text-accent-soft"
              >
                B 更好
              </button>
            </div>
          )}

          {step === "voted" && voteMsg && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-bg-border/60 pt-4">
              <p className="text-[12px] text-emerald-400">{voteMsg}</p>
              <button
                onClick={nextRound}
                className="rounded-lg bg-accent px-4 py-1.5 text-[12px] font-medium text-slate-900 transition hover:opacity-90"
              >
                下一轮 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 排行榜 */}
      <div className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-slate-100">
            🏆 具身任务 Elo 排行榜
          </h3>
          {lb && <span className="text-[11px] text-slate-600">累计 {lbVotes} 次盲测投票</span>}
        </div>
        {lbLoading ? (
          <p className="mt-3 text-[12px] text-slate-600">加载中…</p>
        ) : !lb || lb.length === 0 ? (
          <p className="mt-3 text-[12px] text-slate-600">
            还没有对局数据——成为第一场盲测对战的发起者吧！
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="text-slate-600">
                  <th className="pb-2 pr-3 font-medium">#</th>
                  <th className="pb-2 pr-3 font-medium">模型</th>
                  <th className="pb-2 pr-3 font-medium">Elo</th>
                  <th className="pb-2 pr-3 font-medium">胜</th>
                  <th className="pb-2 pr-3 font-medium">负</th>
                  <th className="pb-2 pr-3 font-medium">平</th>
                  <th className="pb-2 pr-3 font-medium">胜率</th>
                  <th className="pb-2 font-medium">场次</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {lb.map((r, i) => {
                  const cfg = MODEL_MAP[r.model];
                  return (
                    <tr key={r.model} className="border-t border-bg-border/60">
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full"
                          style={{ background: cfg?.color ?? "#888" }}
                        />
                        {cfg?.name ?? r.model}
                        {cfg && <span className="ml-1.5 text-[10px] text-slate-600">{cfg.vendor}</span>}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-slate-100">{r.elo}</td>
                      <td className="py-2 pr-3 text-emerald-400">{r.wins}</td>
                      <td className="py-2 pr-3 text-red-400">{r.losses}</td>
                      <td className="py-2 pr-3 text-slate-500">{r.ties}</td>
                      <td className="py-2 pr-3">{r.winRate}%</td>
                      <td className="py-2">{r.matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-600">
          评分采用标准 Elo 算法（K=32，初始 1500）。排行榜数据来自社区真实投票，公开可查。
        </p>
      </div>
    </section>
  );
}
