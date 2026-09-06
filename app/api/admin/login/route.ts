import { NextRequest, NextResponse } from "next/server";
import {
  adminPasswordConfigured,
  checkAdminPassword,
  signAdminToken,
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
} from "@/lib/admin";
import { cookieOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { error: "管理员密码未配置：请在 Vercel 环境变量中设置 ADMIN_PASSWORD" },
      { status: 503 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* 忽略非法 JSON */
  }

  const pw = typeof body.password === "string" ? body.password : "";
  if (!checkAdminPassword(pw)) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_MAX_AGE));
  return res;
}
