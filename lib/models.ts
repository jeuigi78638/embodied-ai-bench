// ============================================================
// lib/models.ts — 模型配置中心
// 「想加新模型，只改这一个文件」：复制一个对象，填好字段即可。
// ============================================================

export type ProviderKey =
  | "openai"
  | "anthropic"
  | "ark"
  | "deepseek"
  | "dashscope"
  | "gemini"
  | "zhipu";

export type Category = "国产" | "国际";

export interface RadarScores {
  planning: number; // 任务规划
  code: number; // 代码生成
  vision: number; // 视觉理解 (VLM)
  safety: number; // 安全约束意识
  chinese: number; // 中文能力
  speed: number; // 响应速度
}

export interface ModelConfig {
  id: string;
  name: string; // 展示名
  vendor: string; // 厂商
  provider: ProviderKey;
  apiModel: string; // 上游真实模型名
  envKey: string; // 服务端环境变量名
  endpoint: string;
  category: Category;
  tags: string[]; // 能力标签
  // 价格：元 / 百万 token（参考价，部署前以官方定价页为准）
  pricePerMInput: number;
  pricePerMOutput: number;
  firstTokenLatency: string; // 首字延迟（参考）
  color: string; // 卡片主题色
  supportsVision: boolean;
  radar: RadarScores; // 选型雷达默认参考分（0-10，可编辑）
  desc: string;
}

const baseHeaders = {
  "content-type": "application/json",
};

export const MODELS: ModelConfig[] = [
  {
    id: "gpt4o",
    name: "GPT-4o",
    vendor: "OpenAI",
    provider: "openai",
    apiModel: "gpt-4o",
    envKey: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/chat/completions",
    category: "国际",
    tags: ["综合最强", "VLM"],
    pricePerMInput: 18,
    pricePerMOutput: 72,
    firstTokenLatency: "≈1.2s",
    color: "#34D399",
    supportsVision: true,
    radar: { planning: 9, code: 9, vision: 9, safety: 8, chinese: 8, speed: 7 },
    desc: "OpenAI 旗舰多模态模型，任务规划与代码综合能力第一梯队。",
  },
  {
    id: "claude",
    name: "Claude 3.5 Sonnet",
    vendor: "Anthropic",
    provider: "anthropic",
    apiModel: "claude-3-5-sonnet-20241022",
    envKey: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1/messages",
    category: "国际",
    tags: ["代码强", "VLM", "安全"],
    pricePerMInput: 22,
    pricePerMOutput: 110,
    firstTokenLatency: "≈1.5s",
    color: "#FBBF24",
    supportsVision: true,
    radar: { planning: 8, code: 10, vision: 8, safety: 9, chinese: 8, speed: 7 },
    desc: "代码生成与复杂推理见长，安全对齐表现优秀，适合 ROS 代码场景。",
  },
  {
    id: "doubao",
    name: "豆包 1.5 Pro",
    vendor: "字节跳动 · 火山引擎",
    provider: "ark",
    apiModel: "doubao-1-5-pro-32k-250115",
    envKey: "ARK_API_KEY",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    category: "国产",
    tags: ["便宜", "快", "VLM"],
    pricePerMInput: 3.6,
    pricePerMOutput: 14.4,
    firstTokenLatency: "≈0.6s",
    color: "#22D3EE",
    supportsVision: true,
    radar: { planning: 8, code: 8, vision: 8, safety: 7, chinese: 9, speed: 9 },
    desc: "性价比之王，中文与速度优秀，适合高频实时决策场景。",
  },
  {
    id: "deepseek",
    name: "DeepSeek V3",
    vendor: "深度求索",
    provider: "deepseek",
    apiModel: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    category: "国产",
    tags: ["超便宜", "逻辑强"],
    pricePerMInput: 2,
    pricePerMOutput: 8,
    firstTokenLatency: "≈0.8s",
    color: "#A78BFA",
    supportsVision: false,
    radar: { planning: 8, code: 9, vision: 4, safety: 7, chinese: 9, speed: 8 },
    desc: "推理逻辑与中文极佳，成本行业最低，是评测打分/批量场景的首选。",
  },
  {
    id: "qwen",
    name: "通义千问 Qwen-Max",
    vendor: "阿里云 · 百炼",
    provider: "dashscope",
    apiModel: "qwen-max",
    envKey: "DASHSCOPE_API_KEY",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    category: "国产",
    tags: ["国产强", "VLM"],
    pricePerMInput: 20,
    pricePerMOutput: 60,
    firstTokenLatency: "≈1.1s",
    color: "#F87171",
    supportsVision: true,
    radar: { planning: 8, code: 8, vision: 8, safety: 7, chinese: 9, speed: 7 },
    desc: "国产综合能力强，阿里生态接入方便，VLA 开源生态丰富。",
  },
  {
    id: "gemini",
    name: "Gemini 2.5 Pro",
    vendor: "Google",
    provider: "gemini",
    apiModel: "gemini-2.5-pro",
    envKey: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent",
    category: "国际",
    tags: ["长上下文", "VLM"],
    pricePerMInput: 8,
    pricePerMOutput: 40,
    firstTokenLatency: "≈1.4s",
    color: "#60A5FA",
    supportsVision: true,
    radar: { planning: 8, code: 8, vision: 9, safety: 8, chinese: 7, speed: 7 },
    desc: "百万级长上下文与多模态理解，适合场景描述→规划的复杂任务。",
  },
  {
    id: "glm4",
    name: "GLM-4",
    vendor: "智谱 AI",
    provider: "zhipu",
    apiModel: "glm-4-plus",
    envKey: "ZHIPU_API_KEY",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    category: "国产",
    tags: ["国产", "性价比"],
    pricePerMInput: 50,
    pricePerMOutput: 50,
    firstTokenLatency: "≈1.0s",
    color: "#FBBF24",
    supportsVision: false,
    radar: { planning: 7, code: 7, vision: 4, safety: 7, chinese: 8, speed: 8 },
    desc: "智谱自研大模型，中文与代码均衡，开放平台接入简单。",
  },
];

export const MODEL_MAP: Record<string, ModelConfig> = Object.fromEntries(
  MODELS.map((m) => [m.id, m])
);

/** 环境变量里是否配了该模型的 Key（服务端用） */
export function hasKey(m: ModelConfig): boolean {
  return Boolean(process.env[m.envKey]);
}

export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的具身智能（机器人）工程师助手。请遵循以下约束：
1. 输出必须【可执行】：给出具体步骤、参数、代码或判断标准，不要空话。
2. 必须【安全优先】：涉及机械臂、移动底盘、人形机器人等物理动作时，必须包含安全约束（禁止动作、力控、急停、人与物避让）。
3. 若要求代码，请给出可直接运行的代码块，并注明依赖与运行前提。
4. 语言：使用简体中文回答。`;

export const SAFETY_PROMPT_TEMPLATE = `【物理安全约束（强制）】
- 任何动作规划必须包含：急停条件、最大速度/力矩限制、人与障碍物避让、失败回退。
- 禁止生成可能造成人身伤害或财产损坏的动作序列（如高速挥臂、无传感器确认的抓取）。
- 机械臂：抓取前必须确认目标位姿与夹爪状态；力控任务需设置力/力矩阈值。
- 移动底盘：导航需包含行人检测与减速/停车策略。
- 所有输出仅作为仿真/测试参考，真实部署必须经过人工审核与安全评审。`;

export const TASK_TEMPLATES = [
  {
    id: "grasp",
    icon: "🤖",
    label: "机械臂抓取规划",
    prompt:
      "桌上有一个红色马克杯和一个蓝色马克杯，红色杯子前方 10cm 有一个 8cm 高的障碍物。请给出机械臂从 A 点出发抓取红色马克杯并放置到 B 点的完整分步规划（含抓取姿态、移动路径、安全提示），并指出此任务的关键失败点与应对策略。",
  },
  {
    id: "nav",
    icon: "🧭",
    label: "移动机器人导航",
    prompt:
      "室内走廊环境中，移动机器人需从客厅导航到厨房。走廊可能有人经过，厨房门口较窄。请输出：1) 该任务的导航决策框架；2) 面对突然出现行人的处理策略；3) 需要哪些传感器与阈值参数。",
  },
  {
    id: "ros2",
    icon: "💻",
    label: "ROS2 代码生成",
    prompt:
      "请用 Python 写一个 ROS2 节点：订阅 /scan（LaserScan）激光雷达话题，当正前方 0.5m 内检测到障碍物时，在 /cmd_vel 上发布速度为 0 的停止指令，否则按 0.3m/s 前进。请给出完整可运行代码，并注明依赖与运行方式。",
  },
  {
    id: "vlm",
    icon: "👁️",
    label: "场景视觉理解 (VLM)",
    prompt:
      "假设机械臂顶部相机拍到一张俯视工作台图像：桌面上有方块、圆柱、球各一个，光线不均且有阴影。请给出一个判断流程：如何用视觉模型判断哪个物体最容易被抓取？需要哪些预处理、检测与位姿估计步骤？",
  },
  {
    id: "recover",
    icon: "🔄",
    label: "任务失败恢复",
    prompt:
      "机械臂在执行抓取时物体滑落，第二次重试仍失败。请给出完整的失败诊断与恢复策略：1) 如何判定失败原因（位姿误差/夹持力不足/物体表面）；2) 分级重试策略；3) 如何避免反复失败造成效率下降。",
  },
  {
    id: "safety",
    icon: "🛡️",
    label: "安全约束规则生成",
    prompt:
      "请为家庭场景的人形机器人生成一份安全约束规则清单，覆盖：禁止动作、力/速度上限、人员接近时的行为、急停条件、以及与儿童/宠物共处的特别约束。请用清单形式输出，并标注每条的优先级。",
  },
];

export const QUICK_EXAMPLES = [
  "给我一份机械臂抓取红色马克杯的分步规划",
  "写一个 ROS2 激光雷达避障 Python 节点",
  "人形机器人在家庭环境的安全规则清单",
  "导航遇到突然行人该怎么处理？",
  "抓取失败三次了，如何诊断与恢复？",
];
