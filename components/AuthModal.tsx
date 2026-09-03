"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setErr(null);
      setEmail("");
      setPassword("");
      setNickname("");
      setMode("login");
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    if (!email.trim() || !password) {
      setErr("请输入邮箱和密码");
      return;
    }
    setBusy(true);
    const e = email.trim();
    if (mode === "register") {
      if (password.length < 6) {
        setErr("密码至少 6 位");
        setBusy(false);
        return;
      }
      const msg = await register(e, password, nickname.trim() || e.split("@")[0]);
      if (msg) setErr(msg);
      else onClose();
    } else {
      const msg = await login(e, password);
      if (msg) setErr(msg);
      else onClose();
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-bg-border bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-100">
            {mode === "login" ? "登录具身智衡" : "注册账号"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-bg-border bg-slate-800/50 p-1 text-[12px]">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErr(null);
              }}
              className={`rounded-lg py-1.5 transition ${
                mode === m
                  ? "bg-accent font-semibold text-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="昵称（选填）"
              className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent/50"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent/50"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent/50"
          />
        </div>

        {err && (
          <div className="mt-3 rounded-lg border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-[12px] text-neon-red">
            {err}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className={`mt-4 w-full rounded-xl py-2.5 text-[13px] font-semibold transition ${
            busy
              ? "cursor-not-allowed bg-slate-800 text-slate-500"
              : "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
          }`}
        >
          {busy ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-600">
          登录后：机器人 / 帖子云端同步，换设备不丢失
        </p>
      </div>
    </div>
  );
}
