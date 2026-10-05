// ============================================================
// lib/featureVotes.ts — 功能需求投票选项数据
// 分区分组定义 + 投票规则常量。新增/调整功能项只需改这里。
// ============================================================

export interface FeatureVoteItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface FeatureVoteGroup {
  id: string;
  title: string;
  hint: string;
  items: FeatureVoteItem[];
}

export const FEATURE_VOTE_MAX = 5;

export const FEATURE_VOTE_GROUPS: FeatureVoteGroup[] = [
  {
    id: "mobility",
    title: "移动与导航",
    hint: "让机器人自己走路、找路、回家",
    items: [
      { id: "nav-slam", name: "室内建图与定位", desc: "SLAM 实时建图，知道自己在哪", icon: "🗺️" },
      { id: "nav-avoid", name: "自主避障", desc: "绕开桌椅、人、宠物不碰撞", icon: "🛡️" },
      { id: "nav-path", name: "路径规划", desc: "自动规划最优路线，跨房间调度", icon: "🧭" },
      { id: "nav-terrain", name: "爬坡越障", desc: "过门槛、爬斜坡、上小台阶", icon: "⛰️" },
      { id: "nav-charge", name: "自动回充", desc: "电量低自动回充电桩", icon: "🔋" },
    ],
  },
  {
    id: "perception",
    title: "感知与视觉",
    hint: "看得见、认得出、听得准",
    items: [
      { id: "perc-face", name: "人脸与身份识别", desc: "认出家人、访客，记住你是谁", icon: "👤" },
      { id: "perc-object", name: "物体识别", desc: "认出杯子、遥控器、猫狗玩具", icon: "🔍" },
      { id: "perc-gesture", name: "手势 / 姿态识别", desc: "看手势指令，读懂肢体动作", icon: "✋" },
      { id: "perc-thermal", name: "热成像 / 夜视", desc: "黑暗中找人、测温预警", icon: "🌡️" },
      { id: "perc-audio", name: "语音声源定位", desc: "循声找人，嘈杂环境也能锁定", icon: "🎙️" },
    ],
  },
  {
    id: "manipulation",
    title: "操作与执行",
    hint: "动手干活：拿、放、开、递",
    items: [
      { id: "op-arm", name: "机械臂抓取", desc: "抓取、摆放物品，随手帮你拿", icon: "🦾" },
      { id: "op-door", name: "开关门 / 抽屉", desc: "开柜门、拉抽屉、按开关", icon: "🚪" },
      { id: "op-deliver", name: "物品递送", desc: "把东西送到指定的人手里", icon: "📦" },
      { id: "op-dock", name: "充电桩对接", desc: "自动对位插入充电接口", icon: "🔌" },
      { id: "op-clean", name: "清扫整理", desc: "扫拖一体、归位整理杂物", icon: "🧹" },
    ],
  },
  {
    id: "interaction",
    title: "语音与交互",
    hint: "能聊、能听、能懂你",
    items: [
      { id: "int-chat", name: "自然对话助手", desc: "连续对话，像朋友一样聊天", icon: "💬" },
      { id: "int-multi", name: "多语言与方言", desc: "中英切换，听懂方言", icon: "🌐" },
      { id: "int-emotion", name: "情绪识别", desc: "感知你开心还是低落，给回应", icon: "😊" },
      { id: "int-remote", name: "手机远程控制", desc: "出门在外也能遥控指挥", icon: "📱" },
      { id: "int-screen", name: "触屏 / 多模态交互", desc: "屏幕点选 + 语音 + 手势混合操作", icon: "🖥️" },
    ],
  },
  {
    id: "development",
    title: "开发与扩展",
    hint: "开发者：让它长出更多技能",
    items: [
      { id: "dev-sdk", name: "开放 SDK / API", desc: "调用接口，二次开发自己的应用", icon: "🔧" },
      { id: "dev-ros", name: "ROS / ROS2 支持", desc: "兼容主流机器人开发框架", icon: "🤖" },
      { id: "dev-skill", name: "技能插件市场", desc: "下载/发布技能，一键扩展能力", icon: "🧩" },
      { id: "dev-debug", name: "远程监控调试", desc: "网页看实时状态、远程排障", icon: "🛠️" },
      { id: "dev-swarm", name: "多机协作", desc: "多台机器人分工配合干活", icon: "👥" },
    ],
  },
  {
    id: "service",
    title: "服务与场景",
    hint: "真正走进生活，帮上忙",
    items: [
      { id: "svc-security", name: "家庭安防巡逻", desc: "定时巡逻、异常告警、远程查看", icon: "🚨" },
      { id: "svc-kid", name: "儿童陪伴教育", desc: "陪玩、讲故事、启蒙问答", icon: "🧒" },
      { id: "svc-elder", name: "老人健康看护", desc: "吃药提醒、跌倒检测、紧急呼叫", icon: "❤️" },
      { id: "svc-pet", name: "宠物互动", desc: "逗猫遛狗、自动投喂", icon: "🐶" },
      { id: "svc-front", name: "前台接待导览", desc: "迎宾、导览、答疑、带路", icon: "🏢" },
    ],
  },
];

export function getAllFeatureItems(): FeatureVoteItem[] {
  return FEATURE_VOTE_GROUPS.flatMap((g) => g.items);
}

export function isValidFeatureId(id: string): boolean {
  return getAllFeatureItems().some((i) => i.id === id);
}
