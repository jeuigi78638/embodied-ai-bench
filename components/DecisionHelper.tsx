"use client";

import { useMemo, useState } from "react";
import { MODELS, type RadarScores } from "@/lib/models";
import { useReportStore } from "@/lib/store";

// ============================================================
// ④ 具身模型选型决策助手
// 输入：机器人类型 / 核心任务 / 实时频率 / 预算敏感度 / 每日时长
// 输出：推荐模型 Top3 + 理由 + 每日成本测算 + 可复制的选型报告
// 纯前端计算（基于模型能力维度 + 官方参考价），无需 API Key。
// ============================================================

type RobotType = "机械臂" | "移动底盘" | "人形机器人";
type TaskFocus = "规划" | "代码" | "视觉" | "安全" | "综合";
type Budget = "极敏感" | "中等" | "不敏感";

const ROBOT_TYPES: RobotType[] = ["机械臂", "移动底盘", "人形机器人"];
const TASK_FOCUS: TaskFocus[] = ["规划", "代码", "视觉", "安全", "综合"];
const BUDGETS: Budget[] = ["极敏感", "中等", "不敏感"];

const FREQ_OPTIONS = [
  { label: "低频（≤0.1 次/秒）", callsPerSec: 0.1 },
  { label: "中频（1 次/秒）", callsPerSec: 1 },
  { label: "高频（5 次/秒）", callsPerSec: 5 },
  { label: "实时（10 次/秒）", callsPerSec: 10 },
];

// 任务类型 → 六维权重
const TASK_WEIGHTS: Record<TaskFocus, Partial<RadarScores>> = {
  规划: { planning: 0.95, code: 0.6, vision: 0.5, safety: 0.6, chinese: 0.35, speed: 0.45 },
  代码: { planning: 0.45, code: 0.95, vision: 0.3, safety: 0.5, chinese: 0.4, speed: 0.4 },
  视觉: { planning: 0.5, code: 0.35, vision: 0.95, safety: 0.4, chinese: 0.3, speed: 0.3 },
  安全: { planning: 0.5, code: 0.45, vision: 0.3, safety: 0.95, chinese: 0.3, speed: 0.3 },
  综合: { planning: 0.75, code: 0.75, vision: 0.6, safety: 0.65, chinese: 0.5, speed: 0.5 },
};

// 机器人类型 → 六维微调（在任务权重基础上叠加）
const ROBOT_TUNING: Record<RobotType, Partial<RadarScores>> = {
  机械臂: { code: 0.15, planning: 0.15, safety: 0.05 },
  移动底盘: { speed: 0.15, planning: 0.1, safety: 0.05 },
  人形机器人: { safety: 0.2, vision: 0.1, planning: 0.1 },
};

const DIM_KEYS: (keyof RadarScores)[] = [
  "planning",
  "code",
  "vision",
  "safety",
  "chinese",
  "speed",
];

const DIM_LABEL: Record<keyof RadarScores, string> = {
  planning: "任务规划",
  code: "代码生成",
  vision: "视觉理解",
  safety: "安全约束",
  chinese: "中文能力",
  speed: "响应速度",
};

interface Candidate {
  model: (typeof MODELS)[number];
  ability: number; // 能力分 0-100
  dailyCost: number; // 每日成本（元）
  finalScore: number; // 综合推荐分
  reasons: string[];
}

export default function DecisionHelper() {
  const [robot, setRobot] = useState<RobotType>("机械臂");
  const [focus, setFocus] = useState<TaskFocus>("规划");
  const [needVision, setNeedVision] = useState(true);
  const [freqIdx, setFreqIdx] = useState(1);
  const [hours, setHours] = useState(8);
  const [budget, setBudget] = useState<Budget>("中等");
  const [inTokens, setInTokens] = useState(800);
  const [outTokens, setOutTokens] = useState(500);
  const [copied, setCopied] = useState(false);

  // 最近一次实测数据（来自 ①对比工作台 / ②具身评测）
  const reportStore = useReportStore();

  const freq = FREQ_OPTIONS[freqIdx];

  // 预算惩罚系数：极敏感 0.35 / 中等 0.18 / 不敏感 0.05
  const budgetPenalty = budget === "极敏感" ? 0.35 : budget === "中等" ? 0.18 : 0.05;

  const candidates: Candidate[] = useMemo(() => {
    const tuning = ROBOT_TUNING[robot];
    const weights = TASK_WEIGHTS[focus];
    // 若不需要视觉，vision 权重压低
    const effWeights = { ...weights, vision: needVision ? weights.vision ?? 0 : 0.05 };

    // 先算能力分
    const withAbility = MODELS.map((m) => {
      let ability = 0;
      let wSum = 0;
      for (const k of DIM_KEYS) {
        const w = (effWeights[k] ?? 0) + (tuning[k] ?? 0);
        ability += m.radar[k] * w;
        wSum += w;
      }
      ability = wSum ? (ability / wSum) * 10 : 0;
      // 高频实时：速度分额外加成（已含在权重，这里再给高频场景提速加成）
      if (freq.callsPerSec >= 5) ability += m.radar.speed * 0.15;
      return { m, ability };
    });

    // 归一化成本分：最贵的模型成本因子=1，最便宜≈0
    const maxCost = Math.max(
      ...withAbility.map((c) => c.m.pricePerMInput * 0.6 + c.m.pricePerMOutput * 0.4)
    );
    const minCost = Math.min(
      ...withAbility.map((c) => c.m.pricePerMInput * 0.6 + c.m.pricePerMOutput * 0.4)
    );
    const costSpan = maxCost - minCost || 1;

    // 每日成本（先算全部，用于相对成本标签）
    const daily = (m: (typeof MODELS)[number]) =>
      freq.callsPerSec * 3600 * hours * (inTokens * m.pricePerMInput + outTokens * m.pricePerMOutput) / 1e6;
    const dailyCosts = withAbility.map((c) => daily(c.m)).sort((a, b) => a - b);
    const costLow = dailyCosts[Math.max(0, Math.floor(dailyCosts.length / 3) - 1)];
    const costHigh = dailyCosts[Math.min(dailyCosts.length - 1, Math.ceil((dailyCosts.length * 2) / 3))];

    return withAbility.map(({ m, ability }) => {
      const costFactor = (maxCost - (m.pricePerMInput * 0.6 + m.pricePerMOutput * 0.4)) / costSpan;
      const finalScore = ability * (1 - budgetPenalty * (1 - costFactor));
      const cost = daily(m);
      const reasons: string[] = [];
      // 能力理由
      const bestDim = DIM_KEYS.reduce((a, b) => (m.radar[a] >= m.radar[b] ? a : b));
      reasons.push(`${DIM_LABEL[bestDim]}强（${m.radar[bestDim]}/10）`);
      if (m.supportsVision) reasons.push("支持视觉(VLM)");
      else reasons.push("不支持视觉");
      // 成本理由（相对全部候选）
      if (cost <= costLow) reasons.push("每日成本低");
      else if (cost <= costHigh) reasons.push("每日成本适中");
      else reasons.push("每日成本偏高");
      if (m.category === "国产") reasons.push("国产 · 接入方便");
      return { model: m, ability, dailyCost: cost, finalScore, reasons };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [robot, focus, needVision, freq, hours, budget, inTokens, outTokens]);

  const top = candidates.slice(0, 3);

  const buildReport = () => {
    const lines: string[] = [];
    lines.push("# 具身模型选型报告");
    lines.push("");
    lines.push("> 由 具身智衡 EAI-Bench 选型决策助手生成 · 参考数据，正式采购请以官方定价为准");
    lines.push("");
    lines.push("## 一、场景参数");
    lines.push(`- 机器人类型：${robot}`);
    lines.push(`- 核心任务：${focus}`);
    lines.push(`- 视觉需求：${needVision ? "需要（VLM）" : "不需要"}`);
    lines.push(`- 调用频率：${freq.label}`);
    lines.push(`- 每日运行：${hours} 小时`);
    lines.push(`- 预算敏感度：${budget}`);
    lines.push(`- 单次 Token：输入 ${inTokens} / 输出 ${outTokens}`);
    lines.push("");
    lines.push("## 二、推荐结论");
    top.forEach((c, i) => {
      lines.push(`${i + 1}. **${c.model.name}**（综合分 ${Math.round(c.finalScore)}，能力分 ${Math.round(c.ability)}）`);
      lines.push(`   - 理由：${c.reasons.join("；")}`);
      lines.push(`   - 预估每日成本：¥${c.dailyCost.toFixed(2)}`);
    });
    lines.push("");
    lines.push("## 三、全部模型每日成本测算");
    lines.push("");
    lines.push("| 模型 | 能力分 | 综合分 | 每日成本(元) |");
    lines.push("|---|---|---|---|");
    candidates.forEach((c) => {
      lines.push(`| ${c.model.name} | ${Math.round(c.ability)} | ${Math.round(c.finalScore)} | ${c.dailyCost.toFixed(2)} |`);
    });

    // ---- 实测证据（若有） ----
    let hasEvidence = false;
    const compare = reportStore.compare;
    const bench = reportStore.bench;
    if (compare && Object.keys(compare.results).length > 0) {
      hasEvidence = true;
      lines.push("");
      lines.push("## 四、实测：最近一次多模型对比");
      lines.push(`> 任务指令：${compare.prompt}`);
      lines.push("");
      lines.push("| 模型 | 状态 | 回答长度 | 摘要 |");
      lines.push("|---|---|---|---|");
      Object.entries(compare.results).forEach(([id, r]) => {
        const excerpt = r.text.replace(/\s+/g, " ").slice(0, 90);
        lines.push(
          `| ${id} | ${r.error ? `失败(${r.error.slice(0, 40)})` : r.status} | ${r.text.length}字 | ${excerpt} |`
        );
      });
    }
    if (bench && bench.summary.length > 0) {
      hasEvidence = true;
      lines.push("");
      lines.push(`## ${compare ? "五" : "四"}、实测：具身专项评测排行`);
      lines.push(`> 评测题数：${bench.taskCount} · 自动评分仅供参考`);
      lines.push("");
      lines.push("| 排名 | 模型 | 平均分 | 评级 |");
      lines.push("|---|---|---|---|");
      bench.summary.forEach((s, i) => {
        lines.push(`| ${i + 1} | ${s.modelName} | ${s.avg} | ${s.grade} |`);
      });
    }

    lines.push("");
    lines.push(`## ${compare && bench ? "六" : hasEvidence ? "五" : "四"}、风险提示`);
    lines.push("- 本报告基于模型公开能力画像与参考价格计算，真实表现请以实际评测为准。");
    lines.push("- 机器人动作/代码部署前必须经过人工安全评审。");
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <section id="decision" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ④ 具身模型选型决策助手
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            回答 4 个场景问题，直接给你<strong className="text-accent-soft">推荐模型 Top3 + 每日成本测算 + 选型报告</strong>。
            给老板/客户汇报用，一条命令都不用懂。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* 左：参数向导 */}
          <div className="panel h-fit p-4 lg:sticky lg:top-20">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[12px] text-slate-400">① 机器人类型</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ROBOT_TYPES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRobot(r)}
                      className={`rounded-lg border px-2 py-2 text-[12px] transition ${
                        robot === r
                          ? "border-accent/50 bg-accent/10 text-accent-soft"
                          : "border-bg-border text-slate-500 hover:border-slate-600"
                      }`}
                    >
                      {r === "机械臂" ? "🦾" : r === "移动底盘" ? "🚗" : "🤖"} {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] text-slate-400">② 核心任务</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TASK_FOCUS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFocus(t)}
                      className={`rounded-lg border px-2 py-2 text-[12px] transition ${
                        focus === t
                          ? "border-accent/50 bg-accent/10 text-accent-soft"
                          : "border-bg-border text-slate-500 hover:border-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-bg-border px-3 py-2.5">
                <span className="text-[13px] text-slate-300">需要视觉理解（看相机画面）</span>
                <input
                  type="checkbox"
                  checked={needVision}
                  onChange={(e) => setNeedVision(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>

              <div>
                <div className="mb-1.5 text-[12px] text-slate-400">③ 调用频率</div>
                <select
                  value={freqIdx}
                  onChange={(e) => setFreqIdx(Number(e.target.value))}
                  className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-accent/50"
                >
                  {FREQ_OPTIONS.map((f, i) => (
                    <option key={i} value={i}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] text-slate-400">
                  <span>④ 每日运行时长</span>
                  <span className="text-accent-soft">{hours} 小时</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-[12px] text-slate-400">⑤ 预算敏感度</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {BUDGETS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBudget(b)}
                      className={`rounded-lg border px-2 py-2 text-[12px] transition ${
                        budget === b
                          ? "border-accent/50 bg-accent/10 text-accent-soft"
                          : "border-bg-border text-slate-500 hover:border-slate-600"
                      }`}
                    >
                      {b === "极敏感" ? "💰" : b === "中等" ? "⚖️" : "🚀"} {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[11px] text-slate-500">单次输入 Token</div>
                  <input
                    type="number"
                    min={100}
                    max={8000}
                    value={inTokens}
                    onChange={(e) => setInTokens(Number(e.target.value) || 100)}
                    className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-slate-500">单次输出 Token</div>
                  <input
                    type="number"
                    min={50}
                    max={4000}
                    value={outTokens}
                    onChange={(e) => setOutTokens(Number(e.target.value) || 50)}
                    className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-accent/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右：结果 */}
          <div className="space-y-4">
            {/* 推荐 Top3 */}
            <div className="grid gap-3 md:grid-cols-3">
              {top.map((c, i) => (
                <div
                  key={c.model.id}
                  className={`panel p-4 ${i === 0 ? "border-accent/40 shadow-glow" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-slate-100">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {c.model.name}
                    </span>
                    {i === 0 && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent-soft">
                        推荐
                      </span>
                    )}
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, c.finalScore)}%`, backgroundColor: c.model.color }}
                      />
                    </div>
                    <span className="text-[13px] font-bold" style={{ color: c.model.color }}>
                      {Math.round(c.finalScore)}
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11.5px] text-slate-400">
                    {c.reasons.map((r, j) => (
                      <li key={j}>· {r}</li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t border-bg-border pt-2 text-[12px]">
                    <span className="text-slate-500">每日成本 </span>
                    <span className={`font-semibold ${c.dailyCost < 5 ? "text-neon-green" : c.dailyCost < 50 ? "text-accent-soft" : "text-amber-300"}`}>
                      ¥{c.dailyCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 一句话结论 */}
            <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-[13px] leading-relaxed text-slate-300">
              💡 <strong className="text-accent-soft">{top[0]?.model.name}</strong> 最贴合你的场景（{robot}·{focus}）：
              {top[0]?.reasons.slice(0, 2).join("；")}。预估每日成本约{" "}
              <strong className="text-neon-green">¥{top[0]?.dailyCost.toFixed(2)}</strong>，比最贵方案每月省约{" "}
              <strong className="text-neon-green">
                ¥
                {(
                  ((candidates[candidates.length - 1]?.dailyCost ?? 0) - (top[0]?.dailyCost ?? 0)) *
                  30
                ).toFixed(2)}
              </strong>
              。
            </div>

            {/* 最近实测数据（报告的证据来源） */}
            <div className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-200">
                  🔬 最近实测数据（自动并入报告）
                </span>
                <span className="text-[11px] text-slate-600">来自 ①对比工作台 / ②具身评测</span>
              </div>
              {!reportStore.compare && !reportStore.bench ? (
                <p className="text-[12px] leading-relaxed text-slate-600">
                  还没有实测记录。先去 <a href="#workbench" className="text-accent-soft hover:underline">①对比工作台</a> 跑一次
                  模型对比，或去 <a href="#benchmark" className="text-accent-soft hover:underline">②具身评测</a> 跑一次评测，
                  复制选型报告时会自动带上这些实测证据（建议 + 证据）。
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {reportStore.compare && (
                    <div className="rounded-xl border border-bg-border bg-bg-soft/40 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-medium text-accent-soft">多模型对比</span>
                        <span className="text-[10px] text-slate-600">
                          {new Date(reportStore.compare.finishedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mb-1.5 truncate text-[12px] text-slate-300" title={reportStore.compare.prompt}>
                        💬 {reportStore.compare.prompt}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(reportStore.compare.results).map(([id, r]) => (
                          <span
                            key={id}
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              r.error
                                ? "bg-neon-red/15 text-neon-red"
                                : "bg-accent/10 text-accent-soft"
                            }`}
                          >
                            {id} {r.error ? "✕" : `${r.text.length}字`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {reportStore.bench && (
                    <div className="rounded-xl border border-bg-border bg-bg-soft/40 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-medium text-accent-soft">具身专项评测</span>
                        <span className="text-[10px] text-slate-600">{reportStore.bench.taskCount} 题</span>
                      </div>
                      <div className="space-y-1">
                        {reportStore.bench.summary.slice(0, 4).map((s, i) => (
                          <div key={s.model} className="flex items-center justify-between text-[11.5px]">
                            <span className="text-slate-300">
                              {["🥇", "🥈", "🥉", "🔹"][i] ?? "🔹"} {s.modelName}
                            </span>
                            <span className="text-slate-400">
                              {s.avg} 分 · <span className="text-accent-soft">{s.grade}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 成本表 */}
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-semibold text-slate-200">全部模型每日成本测算</span>
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-[12px] text-accent-soft transition hover:bg-accent/20"
                >
                  {copied ? "已复制 ✓" : "📋 复制选型报告"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="border-y border-bg-border bg-slate-800/40 text-left text-slate-400">
                      <th className="px-4 py-2.5 font-medium">模型</th>
                      <th className="px-4 py-2.5 font-medium">能力分</th>
                      <th className="px-4 py-2.5 font-medium">综合分</th>
                      <th className="px-4 py-2.5 font-medium">每日成本</th>
                      <th className="px-4 py-2.5 font-medium">月度成本(30天)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.model.id} className="border-b border-bg-border/50 last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 text-slate-200">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.model.color }} />
                            {c.model.name}
                            {c.model.id === top[0]?.model.id && (
                              <span className="rounded bg-accent/15 px-1.5 text-[10px] text-accent-soft">推荐</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{Math.round(c.ability)}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold" style={{ color: c.model.color }}>
                            {Math.round(c.finalScore)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">¥{c.dailyCost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-slate-400">¥{(c.dailyCost * 30).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-bg-border bg-bg-soft/30 px-4 py-2 text-[11px] text-slate-600">
                成本口径：{freq.callsPerSec}次/秒 × {hours}小时/天 × （{inTokens}输入 + {outTokens}输出）token · 价格为参考价，请以官方定价为准。
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
