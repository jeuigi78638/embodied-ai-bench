// ============================================================
// app/api/auth/logout/route.ts — 退出登录
// ============================================================

import { NextRequest } from "next/server";
import { AUTH_COOKIE, cookieOptions } from "@/lib/auth";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const res = json({ ok: true }, 200);
  res.cookies.set(AUTH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return res;
}
