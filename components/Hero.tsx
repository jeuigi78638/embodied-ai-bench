"use client";

const STATS = [
  { value: "7", label: "主流大模型并发" },
  { value: "6", label: "具身任务场景" },
  { value: "SSE", label: "流式实时输出" },
  { value: "1min", label: "Vercel 一键上线" },
];

const SCENES = [
  { icon: "🤖", label: "机械臂抓取规划" },
  { icon: "🧭", label: "移动机器人导航" },
  { icon: "💻", label: "ROS2 代码生成" },
  { icon: "👁️", label: "场景视觉理解" },
  { icon: "🔄", label: "任务失败恢复" },
  { icon: "🛡️", label: "安全约束规则" },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-10 sm:pt-28">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-[12px] text-accent-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          多模型 × 具身智能 评测工作台
        </div>

        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-100 sm:text-5xl">
          让机器人团队<span className="gradient-text"> 5 分钟</span>
          <br className="hidden sm:block" />
          看清 7 个模型的真实差距
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[14px] leading-relaxed text-slate-400 sm:text-[15px]">
          同一个具身任务指令（机械臂规划 / 导航 / ROS2 代码 / 视觉理解），
          GPT-4o、Claude、豆包、DeepSeek、通义、Gemini、GLM
          七个模型<span className="text-accent-soft">并发流式输出</span>，
          内置具身安全约束模板与专项评测，选型又快又省。
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#workbench"
            className="rounded-xl bg-accent px-6 py-2.5 text-[14px] font-semibold text-black shadow-glow transition hover:bg-accent-soft"
          >
            开始对比 →
          </a>
          <a
            href="#benchmark"
            className="rounded-xl border border-bg-border bg-bg-card/60 px-6 py-2.5 text-[14px] font-medium text-slate-300 transition hover:border-accent/40 hover:text-accent-soft"
          >
            跑具身专项评测
          </a>
        </div>

        {/* 场景标签 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {SCENES.map((s) => (
            <span
              key={s.label}
              className="rounded-full border border-bg-border bg-bg-card/70 px-3 py-1 text-[12px] text-slate-400"
            >
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        {/* 数据点 */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="panel px-4 py-4">
              <div className="text-xl font-bold text-accent">{s.value}</div>
              <div className="mt-1 text-[12px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
