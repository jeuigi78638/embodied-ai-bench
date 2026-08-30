"use client";

import { MODELS } from "@/lib/models";

export default function CostSection() {
  // 按「每轮典型问答成本」估算排序（输入 1K token + 输出 1K token）
  const rows = [...MODELS].sort(
    (a, b) =>
      a.pricePerMInput * 0.6 + a.pricePerMOutput * 0.4 - (b.pricePerMInput * 0.6 + b.pricePerMOutput * 0.4)
  );

  return (
    <section id="cost" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ⑤ 成本与延迟速查
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            元 / 百万 token（输入·输出），用于高频实时决策场景算账。
            <span className="text-amber-400"> 参考价，部署前请以各厂商官方定价页为准。</span>
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-bg-border bg-slate-800/40 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">模型</th>
                  <th className="px-4 py-3 font-medium">厂商</th>
                  <th className="px-4 py-3 font-medium">输入（元/M）</th>
                  <th className="px-4 py-3 font-medium">输出（元/M）</th>
                  <th className="px-4 py-3 font-medium">典型轮次成本*</th>
                  <th className="px-4 py-3 font-medium">首字延迟</th>
                  <th className="px-4 py-3 font-medium">VLM</th>
                  <th className="px-4 py-3 font-medium">适用场景</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const perRound =
                    m.pricePerMInput * 0.0006 + m.pricePerMOutput * 0.0004;
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-bg-border/60 last:border-0 hover:bg-slate-800/20"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium text-slate-200">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                          {m.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.vendor}</td>
                      <td className="px-4 py-3 text-slate-300">{m.pricePerMInput}</td>
                      <td className="px-4 py-3 text-slate-300">{m.pricePerMOutput}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            perRound < 0.005
                              ? "bg-neon-green/15 text-neon-green"
                              : perRound < 0.03
                                ? "bg-accent/15 text-accent-soft"
                                : "bg-amber-400/15 text-amber-300"
                          }`}
                        >
                          ≈¥{perRound.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.firstTokenLatency}</td>
                      <td className="px-4 py-3">
                        {m.supportsVision ? (
                          <span className="text-accent-soft">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-bg-border bg-bg-soft/30 px-4 py-2.5 text-[11px] text-slate-600">
            * 典型轮次成本 = 输入 600 token + 输出 400 token 的估算价。价格随官方调整变化，仅作量级参考。
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="panel p-4">
            <div className="text-[13px] font-semibold text-slate-200">💡 高频实时决策（10Hz）</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              优先看成本档与首字延迟：豆包 / DeepSeek 为默认首选，单次决策成本低一个量级。
            </p>
          </div>
          <div className="panel p-4">
            <div className="text-[13px] font-semibold text-slate-200">🛡️ 安全关键任务</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              ROS2 代码 / 安全规则生成优先 Claude（安全对齐强），上线前必须人工评审。
            </p>
          </div>
          <div className="panel p-4">
            <div className="text-[13px] font-semibold text-slate-200">👁️ 视觉场景理解</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              需要看懂相机画面的任务选 GPT-4o / Gemini / 豆包 / 通义等 VLM 模型。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
