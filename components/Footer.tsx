"use client";

export default function Footer() {
  return (
    <footer className="border-t border-bg-border py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[14px] font-semibold text-slate-200">
              具身智衡 EAI-Bench
            </div>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500">
              多模型 × 具身智能实时评测工作台。模型回答仅用于技术选型参考，
              <b className="text-amber-400">真实机器人部署前必须经过人工安全评审</b>。
              各模型价格为参考价，请以官方定价为准。
            </p>
            <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-violet-400/70">
              ⚖️ 本站内容（含 AI 生成内容，均带「AI 生成」标识）仅供学习研究参考，
              不构成专业结论；如发现违规或侵权内容，请联系
              <a href="mailto:2845972368@qq.com" className="underline decoration-dotted underline-offset-2 transition hover:text-violet-300">
                2845972368@qq.com
              </a>{" "}
              举报。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] text-slate-500">
            {["GPT-4o", "Claude", "豆包", "DeepSeek", "通义千问", "Gemini", "GLM-4"].map(
              (n) => (
                <span key={n} className="rounded-full border border-bg-border px-2.5 py-1">
                  {n}
                </span>
              )
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bg-border/60 pt-4 text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} EAI-Bench · 用 Next.js + Edge Function 构建 · 开源可部署</span>
          <a href="/privacy" className="transition hover:text-accent-soft">
            隐私政策
          </a>
          <a href="/terms" className="transition hover:text-accent-soft">
            用户协议
          </a>
        </div>
      </div>
    </footer>
  );
}
