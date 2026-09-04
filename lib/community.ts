// ============================================================
// lib/community.ts — 机器人讨论平台数据层
// 分类 / 帖子 / 评论 / 种子话题 / localStorage 存储
//
// ⚠️ MVP 说明：当前数据存于浏览器 localStorage（本地演示），
// 不同设备/用户之间不互通。后续接入真实后端
// （Vercel Postgres / KV + API）后，将 loadPosts/savePosts
// 替换为 fetch 调用即可，UI 无需改动。
// ============================================================

export type TopicCategory =
  | "行业动态"
  | "技术问答"
  | "产品讨论"
  | "学习求职"
  | "自由闲聊";

export const CATEGORIES: TopicCategory[] = [
  "行业动态",
  "技术问答",
  "产品讨论",
  "学习求职",
  "自由闲聊",
];

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: TopicCategory;
  author: string;
  createdAt: number;
  likes: number;
  liked: boolean; // 当前用户是否已点赞
  aiSummary?: string; // AI 生成摘要（可选）
  isSeed?: boolean; // 种子演示数据标记
  owner?: boolean; // 云端标记：是否是当前登录用户发布的帖子
  comments: Comment[];
}

const STORAGE_KEY = "eai_community_posts_v1";

const now = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ---------- 种子话题（让页面开箱即有内容，标注为演示数据） ----------
const SEED: Post[] = [
  {
    id: "seed-1",
    title: "人形机器人落地元年：宇树、智元、特斯拉，谁走在前列？",
    content:
      "2025 被称为人形机器人元年，宇树 G1 量产、智元远征系列迭代、特斯拉 Optimus 进厂实训。\n\n个人观察：国产厂商在成本控制和供应链上有优势，但真正决定落地的还是「大脑」（具身大模型）和「场景闭环」。大家怎么看三家的差距？押注哪家？",
    category: "行业动态",
    author: "EAI-Bench",
    createdAt: now - 2 * HOUR,
    likes: 42,
    liked: false,
    isSeed: true,
    aiSummary: "讨论人形机器人头部厂商差距：国产靠成本供应链、落地看具身大模型与场景闭环。",
    comments: [
      {
        id: "seed-1-c1",
        author: "机器人观察员",
        content: "押宇树，量产规模本身就是护城河。",
        createdAt: now - 1 * HOUR,
      },
      {
        id: "seed-1-c2",
        author: "搞ROS的",
        content: "落地关键还是数据闭环，谁先跑通一个赚钱场景谁赢。",
        createdAt: now - 30 * MIN,
      },
    ],
  },
  {
    id: "seed-2",
    title: "具身智能 VLA 大模型盘点：哪些值得关注？",
    content:
      "VLA（视觉-语言-动作）模型是具身智能的热点：RT-2、OpenVLA、以及国内不少团队的开源方案。\n\n想知道实际部署经验：哪些模型真的能在真机上跑？推理延迟、泛化能力、成本分别怎样？求真实踩坑分享。",
    category: "行业动态",
    author: "EAI-Bench",
    createdAt: now - 5 * HOUR,
    likes: 31,
    liked: false,
    isSeed: true,
    aiSummary: "盘点 VLA 大模型实际部署：关注真机可行性、推理延迟、泛化与成本。",
    comments: [
      {
        id: "seed-2-c1",
        author: "实验室搬砖工",
        content: "OpenVLA 开源好上手，但真机泛化还是要自己 finetune。",
        createdAt: now - 2 * HOUR,
      },
    ],
  },
  {
    id: "seed-3",
    title: "ROS2 和 ROS1 到底差在哪？新手该学哪个？",
    content:
      "入坑机器人开发，经常被劝直接学 ROS2。但看到很多老项目还是 ROS1。\n\n求一个客观对比：API、通信、生态、学习成本，以及 2025 年新项目到底该不该全上 ROS2？",
    category: "技术问答",
    author: "EAI-Bench",
    createdAt: now - 8 * HOUR,
    likes: 55,
    liked: false,
    isSeed: true,
    aiSummary: "ROS2 相比 ROS1 在通信架构/实时性/生态更现代，新项目建议直接 ROS2。",
    comments: [
      {
        id: "seed-3-c1",
        author: "自动驾驶老兵",
        content: "直接 ROS2，别犹豫。Humble 版本生态已经很全了。",
        createdAt: now - 3 * HOUR,
      },
      {
        id: "seed-3-c2",
        author: "刚毕业的程序员",
        content: "我学了 ROS1 再转 ROS2，概念基本通用，但 DDS 那套还是有点劝退。",
        createdAt: now - 1 * HOUR,
      },
    ],
  },
  {
    id: "seed-4",
    title: "机械臂视觉抓取，手眼标定怎么做最省事？",
    content:
      "在做机械臂视觉抓取，卡在手眼标定（eye-in-hand / eye-to-hand）。\n\n用传统标定板流程繁琐，想问问有没有更省事的方案？ArUco + 手搓标定工具可行吗？有没有开源现成方案推荐？",
    category: "技术问答",
    author: "EAI-Bench",
    createdAt: now - 1 * DAY,
    likes: 38,
    liked: false,
    isSeed: true,
    aiSummary: "手眼标定可用 ArUco + 开源工具（如 easy_handeye）快速完成，注意采集位姿多样性。",
    comments: [
      {
        id: "seed-4-c1",
        author: "抓取调参人",
        content: "easy_handeye + ArUco 真香，半小时搞定 eye-to-hand。",
        createdAt: now - 12 * HOUR,
      },
    ],
  },
  {
    id: "seed-5",
    title: "机器狗买来能干什么？普通人值得入手吗？",
    content:
      "宇树 Go2 之类的机器狗现在几万块，看着挺酷。\n\n普通人（非开发者）买来能干什么？遛弯、拍照、看家？还是纯吃灰？值不值得为好奇心买单？求真实用户聊聊。",
    category: "产品讨论",
    author: "EAI-Bench",
    createdAt: now - 1 * DAY - 3 * HOUR,
    likes: 67,
    liked: false,
    isSeed: true,
    aiSummary: "机器狗对普通人是玩具属性偏强，主要价值在开发/教学/内容创作，慎为好奇心买单。",
    comments: [
      {
        id: "seed-5-c1",
        author: "家里有狗机器人",
        content: "买回来前两周很新鲜，之后就是吃灰+偶尔遛弯拍视频。",
        createdAt: now - 8 * HOUR,
      },
      {
        id: "seed-5-c2",
        author: "数码博主",
        content: "做内容的话回本很快，纯自用确实看个人。",
        createdAt: now - 5 * HOUR,
      },
    ],
  },
  {
    id: "seed-6",
    title: "扫地机器人算具身智能吗？为什么现在才这么火？",
    content:
      "经常看到「具身智能」概念被乱用，扫地机器人、自动贩卖机都被贴上标签。\n\n理性讨论：扫地机器人有感知-决策-执行闭环，算不算具身智能的初级形态？具身智能和传统机器人自动化本质区别在哪？",
    category: "产品讨论",
    author: "EAI-Bench",
    createdAt: now - 2 * DAY,
    likes: 29,
    liked: false,
    isSeed: true,
    aiSummary: "扫地机具备感知-决策-执行闭环属具身智能初级形态；本质区别在于能否跨任务泛化。",
    comments: [],
  },
  {
    id: "seed-7",
    title: "零基础想入行具身智能，学习路线怎么排？",
    content:
      "背景：非机器人专业，会一点 Python 和 AI 基础。想转具身智能方向。\n\n求一份务实的进阶路线：先学 ROS2 还是先学深度学习？要不要上手仿真环境（Isaac/Gazebo）？数学要补到什么程度？",
    category: "学习求职",
    author: "EAI-Bench",
    createdAt: now - 2 * DAY - 6 * HOUR,
    likes: 84,
    liked: false,
    isSeed: true,
    aiSummary: "零基础入行路线：Python+基础数学 → 深度学习/视觉 → ROS2+仿真（Isaac/Gazebo）→ 项目实战。",
    comments: [
      {
        id: "seed-7-c1",
        author: "已入行的工程师",
        content: "建议先仿真后真机，Isaac Sim 免费，省很多硬件钱。",
        createdAt: now - 1 * DAY,
      },
      {
        id: "seed-7-c2",
        author: "某司AI工程师",
        content: "数学不用太深，线性代数+概率够用，动手能力比理论重要。",
        createdAt: now - 10 * HOUR,
      },
    ],
  },
  {
    id: "seed-8",
    title: "如果机器人进家庭，你最担心什么？",
    content:
      "人形机器人真要进家庭，先别谈功能，你最担心什么？\n\n隐私（摄像头全程看着家）、安全（撞到老人小孩）、就业（会不会被替代）、还是情感依赖？开放聊聊。",
    category: "自由闲聊",
    author: "EAI-Bench",
    createdAt: now - 3 * DAY,
    likes: 96,
    liked: false,
    isSeed: true,
    aiSummary: "家庭机器人主要担忧：隐私监控、物理安全、就业冲击与情感依赖四个维度。",
    comments: [
      {
        id: "seed-8-c1",
        author: "普通用户",
        content: "最怕摄像头 24 小时在家，隐私完全没保障。",
        createdAt: now - 2 * DAY,
      },
      {
        id: "seed-8-c2",
        author: "老父亲",
        content: "安全第一，机器人动了脾气怎么办，得有强制急停。",
        createdAt: now - 1 * DAY,
      },
    ],
  },
];

// ---------- 存储 ----------
function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 隐私模式等场景静默失败 */
  }
}

/** 读取帖子（首次访问时注入种子数据） */
export function loadPosts(): Post[] {
  const raw = safeRead(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Post[];
    } catch {
      /* 解析失败则回退到种子数据 */
    }
  }
  savePosts(SEED);
  return SEED.map((p) => ({ ...p }));
}

export function savePosts(posts: Post[]) {
  safeWrite(STORAGE_KEY, JSON.stringify(posts));
}

export function genId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- 演示用 AI 摘要生成（本地启发式，非真实模型） ----------
export function demoSummarize(title: string, content: string): string {
  const t = title.trim() || content.trim();
  if (t.length <= 24) return t;
  return t.slice(0, 24) + "…";
}

// ---------- 云端同步（登录后走 /api/posts） ----------

interface CloudPost {
  id: string;
  title: string;
  category: string;
  content: string;
  author: string;
  avatar?: string;
  aiSummary?: string;
  likes: string[];
  comments: Comment[];
  isSeed?: boolean;
  owner?: boolean;
  createdAt: number;
}

/** 云端帖子 → 前端 Post（likes 数 = 数组长度） */
function fromCloud(p: CloudPost): Post {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    category: (CATEGORIES as string[]).includes(p.category)
      ? (p.category as TopicCategory)
      : "自由闲聊",
    author: p.author || "机器人玩家",
    createdAt: p.createdAt,
    likes: Array.isArray(p.likes) ? p.likes.length : 0,
    liked: false,
    aiSummary: p.aiSummary,
    isSeed: Boolean(p.isSeed),
    owner: Boolean(p.owner),
    comments: Array.isArray(p.comments) ? p.comments : [],
  };
}

export async function loadCloudPosts(): Promise<Post[] | null> {
  try {
    const res = await fetch("/api/posts");
    const j = await res.json();
    if (j?.ok && Array.isArray(j.posts)) {
      return (j.posts as CloudPost[]).map(fromCloud);
    }
    return null;
  } catch {
    return null;
  }
}

/** 前端 Post → 云端（likes 数转为数组长度） */
export async function saveCloudPost(post: Post): Promise<boolean> {
  try {
    const likesArr: string[] = [];
    for (let i = 0; i < (post.likes || 0); i++) likesArr.push(`u${i}`);
    if (post.liked) likesArr.push("me");
    const body = {
      id: post.id,
      title: post.title,
      category: post.category,
      content: post.content,
      author: post.author,
      avatar: "🤖",
      aiSummary: post.aiSummary ?? "",
      likes: likesArr,
      comments: post.comments ?? [],
      createdAt: post.createdAt,
    };
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

/** 删除自己的云端帖子（仅作者本人，后端校验） */
export async function deleteCloudPost(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const j = await res.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}
