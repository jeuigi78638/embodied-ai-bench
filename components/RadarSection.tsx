"use client";

import { useMemo, useState } from "react";
import { MODELS } from "@/lib/models";

const DIMS: { key: keyof (typeof MODELS)[0]["radar"]; label: string }[] = [
  { key: "planning", label: "任务规划" },
  { key: "code", label: "代码生成" },
  { key: "vision", label: "视觉理解" },
  { key: "safety", label: "安全约束" },
  { key: "chinese", label: "中文能力" },
  { key: "speed", label: "响应速度" },
];

const W = 460;
const H = 400;
const CX = W / 2;
const CY = H / 2 + 10;
const R = 150;

function pt(i: number, value: number) {
  const angle = (2 * Math.PI * i) / DIMS.length - Math.PI / 2;
  const r = (R * value) / 10;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as const;
}

export default function RadarSection() {
  const [active, setActive] = useState<string>("doubao");
  const [scores, setScores] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    MODELS.forEach((m) => {
      init[m.id] = DIMS.map((d) => m.radar[d.key]);
    });
    return init;
  });

  const model = MODELS.find((m) => m.id === active) ?? MODELS[0];

  const polygonPoints = useMemo(() => {
    const pts = DIMS.map((_, i) => pt(i, scores[active][i]));
    return pts.map((p) => p.join(",")).join(" ");
  }, [active, scores]);

  // 网格：同心多边形（2/4/6/8/10 分）
  const grids = [2, 4, 6, 8, 10].map((v) => {
    const pts = DIMS.map((_, i) => pt(i, v));
    return pts.map((p) => p.join(",")).join(" ");
  });

  const setDim = (idx: number, value: number) => {
    setScores((prev) => {
      const next = { ...prev };
      next[active] = [...prev[active]];
      next[active][idx] = value;
      return next;
    });
  };

  const total = scores[active].reduce((s, v) => s + v, 0);

  return (
    <section id="radar" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ③ 模型选型雷达图
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            6 维能力画像。默认参考分为编辑推荐值，可拖动下方滑块按你的场景权重调整，用于技术选型汇报。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* 模型切换 */}
          <div className="panel h-fit p-4">
            <span className="mb-3 block text-[13px] font-semibold text-slate-200">选择模型</span>
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    active === m.id
                      ? "border-accent/40 bg-accent/8"
                      : "border-bg-border hover:border-slate-600"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="flex-1 text-[13px] text-slate-200">{m.name}</span>
                  <span className="text-[11px] text-slate-500">综合 {scores[m.id].reduce((s, v) => s + v, 0)}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
              {model.desc}
            </p>
          </div>

          {/* 雷达图 + 滑块 */}
          <div className="panel p-4">
            <div className="grid items-center gap-4 md:grid-cols-2">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[440px]">
                {grids.map((g) => (
                  <polygon
                    key={g}
                    points={g}
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1"
                  />
                ))}
                {/* 轴线 */}
                {DIMS.map((_, i) => {
                  const [x, y] = pt(i, 10);
                  return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#1E293B" strokeWidth="1" />;
                })}
                {/* 数据多边形 */}
                <polygon
                  points={polygonPoints}
                  fill={`${model.color}26`}
                  stroke={model.color}
                  strokeWidth="2"
                />
                {/* 数据点 */}
                {DIMS.map((_, i) => {
                  const [x, y] = pt(i, scores[active][i]);
                  return <circle key={i} cx={x} cy={y} r="3.5" fill={model.color} />;
                })}
                {/* 维度标签 */}
                {DIMS.map((d, i) => {
                  const [x, y] = pt(i, 10.8);
                  const anchor = Math.abs(x - CX) < 12 ? "middle" : x > CX ? "start" : "end";
                  return (
                    <text
                      key={d.key}
                      x={x}
                      y={y}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      className="fill-slate-400"
                      fontSize="11"
                    >
                      {d.label}
                    </text>
                  );
                })}
              </svg>

              {/* 滑块 */}
              <div className="space-y-3">
                {DIMS.map((d, i) => (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-slate-400">{d.label}</span>
                      <span className="font-semibold" style={{ color: model.color }}>
                        {scores[active][i]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={scores[active][i]}
                      onChange={(e) => setDim(i, Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                ))}
                <div className="rounded-xl border border-bg-border bg-bg-soft/40 p-3 text-[12px] text-slate-400">
                  <b className="text-slate-200">{model.name}</b> 综合能力分：{" "}
                  <b className="text-accent-soft">{total}/60</b>
                  <div className="mt-1 text-[11px] text-slate-600">
                    按当前权重得分排序：{" "}
                    {[...MODELS]
                      .sort(
                        (a, b) =>
                          scores[b.id].reduce((s, v) => s + v, 0) -
                          scores[a.id].reduce((s, v) => s + v, 0)
                      )
                      .slice(0, 3)
                      .map((m) => m.name)
                      .join(" > ")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
