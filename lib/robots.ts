// ============================================================
// lib/robots.ts — 机器人构建专区数据层
// 用户「捏」自己的具身智能机器人：角色/技能/风格/绑定模型，
// 数据保存在浏览器 localStorage（MVP），后续可迁到真实后端。
// 对话时按 robot.model 调对应模型，并带上用户自配的 Key（BYOK）。
// ============================================================

export interface Robot {
  id: string;
  name: string;
  avatar: string; // emoji 头像
  role: string; // 角色定位
  skills: string[]; // 能力标签
  style: string; // 回答风格
  systemPrompt: string; // 系统提示词（自动生成后可编辑）
  model: string; // 绑定模型 id（对应 lib/models.ts）
  createdAt: number;
}

export const ROBOT_ROLES = [
  { id: "arm", label: "机械臂工程师", desc: "抓取/分拣/码垛规划" },
  { id: "nav", label: "移动导航专家", desc: "底盘导航/避障决策" },
  { id: "ros", label: "ROS2 开发者", desc: "节点/驱动/仿真代码" },
  { id: "vla", label: "VLA 研究员", desc: "视觉语言动作模型" },
  { id: "safety", label: "安全审核官", desc: "约束/急停/合规审查" },
  { id: "general", label: "全能助手机器人", desc: "具身智能百事通" },
] as const;

export const ROBOT_SKILLS = [
  "任务规划",
  "代码生成",
  "视觉理解",
  "安全约束",
  "失败恢复",
] as const;

export const ROBOT_STYLES = [
  { id: "rigor", label: "严谨", desc: "重参数、讲依据" },
  { id: "concise", label: "简洁", desc: "三步说完，不废话" },
  { id: "humor", label: "幽默", desc: "带梗但不跑题" },
  { id: "detail", label: "细致", desc: "逐步展开，覆盖全面" },
] as const;

const STYLE_HINT: Record<string, string> = {
  rigor: "用词严谨，给出可量化参数与判断依据。",
  concise: "回答精炼，先给结论再给要点，避免冗长。",
  humor: "语气轻松幽默，适当使用比喻，但不影响专业性。",
  detail: "回答详尽，分步骤展开，覆盖边界情况。",
};

/** 根据角色 + 技能 + 风格自动生成系统提示词 */
export function buildSystemPrompt(
  name: string,
  role: string,
  skills: string[],
  style: string
): string {
  const roleLabel =
    ROBOT_ROLES.find((r) => r.id === role)?.label ?? "具身智能机器人";
  const skillText =
    skills.length > 0 ? skills.join("、") : "通用具身智能问答";
  const styleHint = STYLE_HINT[style] ?? "回答清晰直接。";
  return [
    `你是「${name}」，一位${roleLabel}，专注方向：${skillText}。`,
    styleHint,
    "作为具身智能（机器人）助手，请遵循：",
    "1. 输出必须可执行：给出具体步骤、参数、代码或判断标准。",
    "2. 安全优先：涉及机械臂、移动底盘、人形机器人等物理动作时，必须包含安全约束（禁止动作、力控、急停、避让）。",
    "3. 要求代码时，给出可直接运行的代码块并注明依赖。",
    "4. 使用简体中文回答。",
  ].join("\n");
}

const STORE_KEY = "eai_robots_v1";

export function genId(): string {
  return `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function loadRobots(): Robot[] {
  // SSR 阶段也返回默认机器人，保证首屏与 hydration 一致
  if (typeof window === "undefined") return [DEFAULT_ROBOT];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [DEFAULT_ROBOT];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Robot[];
    return [DEFAULT_ROBOT];
  } catch {
    return [DEFAULT_ROBOT];
  }
}

export function saveRobot(robot: Robot): Robot[] {
  if (typeof window === "undefined") return loadRobots();
  try {
    const all = loadRobots().filter((r) => r.id !== robot.id);
    const next = [robot, ...all];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRobots();
  }
}

export function deleteRobot(id: string): Robot[] {
  if (typeof window === "undefined") return loadRobots();
  try {
    const next = loadRobots().filter((r) => r.id !== id);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    return next.length > 0 ? next : [DEFAULT_ROBOT];
  } catch {
    return loadRobots();
  }
}

// ---------- 云端同步（登录后走 /api/robots，未登录回退本地） ----------
export async function loadCloudRobots(): Promise<Robot[] | null> {
  try {
    const res = await fetch("/api/robots");
    const j = await res.json();
    if (j?.ok && Array.isArray(j.robots)) return j.robots as Robot[];
    return null;
  } catch {
    return null;
  }
}

export async function saveCloudRobot(robot: Robot): Promise<boolean> {
  try {
    const res = await fetch("/api/robots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(robot),
    });
    const j = await res.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

export async function deleteCloudRobot(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/robots?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const j = await res.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

export const DEFAULT_ROBOT: Robot = {
  id: "r_default_arm",
  name: "老张·机械臂",
  avatar: "🤖",
  role: "arm",
  skills: ["任务规划", "代码生成", "安全约束"],
  style: "rigor",
  systemPrompt:
    "你是「老张·机械臂」，一位机械臂工程师，专注方向：任务规划、代码生成、安全约束。\n用词严谨，给出可量化参数与判断依据。\n作为具身智能（机器人）助手，请遵循：\n1. 输出必须可执行：给出具体步骤、参数、代码或判断标准。\n2. 安全优先：涉及机械臂、移动底盘、人形机器人等物理动作时，必须包含安全约束（禁止动作、力控、急停、避让）。\n3. 要求代码时，给出可直接运行的代码块并注明依赖。\n4. 使用简体中文回答。",
  model: "deepseek",
  createdAt: Date.now(),
};
