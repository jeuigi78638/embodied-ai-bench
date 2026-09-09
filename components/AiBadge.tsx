"use client";

// ============================================================
// components/AiBadge.tsx — AI 生成内容显式标识
// 依据《人工智能生成合成内容标识办法》(2025-09-01 施行)，
// 凡向用户展示的 AI 生成内容均须带显式标识。
// compact: 紧凑角标（卡片头部用）；full: 完整免责（内容下方用）
// ============================================================

export default function AiBadge({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300"
        title="本内容由人工智能生成，仅供技术选型研究参考"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2 13.5 7 18.5 5.5 17 10.5 22 12 17 13.5 18.5 18.5 13.5 17 12 22 10.5 17 5.5 18.5 7 13.5 2 12Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        AI 生成
      </span>
    );
  }
  return (
    <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/8 px-3 py-2 text-[11px] leading-relaxed text-violet-300/90">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2 13.5 7 18.5 5.5 17 10.5 22 12 17 13.5 18.5 18.5 13.5 17 12 22 10.5 17 5.5 18.5 7 13.5 2 12Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>本内容由 AI 生成，仅供技术选型研究参考，不构成专业结论；实际部署前请人工复核。</span>
    </div>
  );
}
