// ============================================================
// lib/userkeys.ts — BYOK（用户自带 Key）前端工具
// 用户把各家模型 API Key 保存在【自己浏览器】的 localStorage，
// 请求时随请求体临时带给服务端转发，服务端只用不存、用后即弃。
// Key 永不写入服务器存储 / 日志；清除缓存或点「清空」即可抹掉。
// ============================================================

const KEY = "eai_user_keys_v1";

export interface UserKeys {
  [envKey: string]: string;
}

/** 读取用户本地已保存的 Key 集合（空对象 = 未配置） */
export function getUserKeys(): UserKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: UserKeys = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.trim()) out[k] = v.trim();
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

/** 覆盖保存（合并更新，不做破坏性全量清空） */
export function setUserKeys(keys: UserKeys): void {
  if (typeof window === "undefined") return;
  try {
    const merged = { ...getUserKeys(), ...keys };
    // 去掉空值项
    for (const k of Object.keys(merged)) {
      if (!merged[k] || !merged[k].trim()) delete merged[k];
    }
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* 隐私模式 / 禁用存储时静默失败 */
  }
}

/** 清空所有用户 Key */
export function clearUserKeys(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** 已配置（非空）的 envKey 列表 */
export function configuredEnvKeys(): string[] {
  return Object.keys(getUserKeys()).filter((k) => {
    const v = getUserKeys()[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}
