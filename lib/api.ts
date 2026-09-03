// ============================================================
// lib/api.ts — API 通用小工具（Node Runtime 路由）
// ============================================================

import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** 解析请求 JSON，失败返回 null */
export async function tryJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
