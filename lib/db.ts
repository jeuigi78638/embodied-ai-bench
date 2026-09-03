// ============================================================
// lib/db.ts — Postgres 连接（Vercel Postgres / Neon）
// 仅供 Node.js Runtime 的 API 使用（auth / robots / posts 等）。
// 流式对比 API 保持 Edge Runtime，不触碰数据库。
// 未配置 DATABASE_URL 时导出 null，相关 API 降级返回「数据库未配置」。
// ============================================================

import postgres from "postgres";

const url = process.env.DATABASE_URL;

export const sql: postgres.Sql<Record<string, never>> | null = url
  ? postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

export function isDbReady(): boolean {
  return Boolean(sql);
}
