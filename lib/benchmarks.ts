// ============================================================
// lib/benchmarks.ts — 具身智能专项评测题库 + 自动评分规则
// 评分说明：采用「启发式自动评分」（关键词 + 结构），仅供快速参考，
// 真实选型请结合人工评审。评分逻辑在 lib/scoring.ts。
// ============================================================

export interface BenchmarkTask {
  id: string;
  title: string;
  icon: string;
  category: string; // 评测维度
  prompt: string;
  rubric: string[]; // 人工评审参考标准
  keywords: string[]; // 自动评分关键词（命中加分）
  requiredStructure: ("code" | "steps" | "safety")[]; // 期望结构
  weight: number; // 总分权重
}

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: "grasp-plan",
    title: "机械臂抓取分步规划",
    icon: "🤖",
    category: "任务规划",
    prompt:
      "桌上有一个红色马克杯和一个蓝色马克杯，红色杯子前方 10cm 有一个 8cm 高障碍物。请给出机械臂从 A 点抓取红色马克杯放置到 B 点的完整分步规划（含抓取姿态、路径、安全提示、失败点分析）。",
    rubric: [
      "是否给出分步动作序列",
      "是否包含抓取姿态（末端朝向/夹爪开度）",
      "是否识别障碍物并给出避让",
      "是否包含安全约束与失败预案",
    ],
    keywords: ["抓取", "姿态", "夹爪", "避让", "安全", "失败", "步骤", "路径"],
    requiredStructure: ["steps", "safety"],
    weight: 1,
  },
  {
    id: "nav-plan",
    title: "移动机器人导航决策",
    icon: "🧭",
    category: "任务规划",
    prompt:
      "室内走廊环境中，移动机器人需从客厅导航到厨房，走廊可能有人经过。请给出导航决策框架、突发行人处理策略、所需传感器与阈值参数。",
    rubric: [
      "是否有决策框架/状态机",
      "是否处理动态障碍（行人）",
      "是否给出传感器选型与参数",
      "是否有减速/停车/急停逻辑",
    ],
    keywords: ["传感器", "行人", "减速", "停车", "急停", "激光", "状态", "阈值"],
    requiredStructure: ["steps", "safety"],
    weight: 1,
  },
  {
    id: "ros2-code",
    title: "ROS2 避障节点代码",
    icon: "💻",
    category: "代码生成",
    prompt:
      "用 Python 写一个 ROS2 节点：订阅 /scan（LaserScan），正前方 0.5m 内检测到障碍物时在 /cmd_vel 发布停止指令，否则按 0.3m/s 前进。给出完整可运行代码并注明依赖。",
    rubric: [
      "代码是否可直接运行",
      "是否正确解析 LaserScan 数据",
      "是否处理了边界/异常",
      "是否包含安全速度逻辑",
    ],
    keywords: ["scan", "cmd_vel", "LaserScan", "0.5", "0.3", "rclpy", "import", "def ", "while"],
    requiredStructure: ["code", "safety"],
    weight: 1.4,
  },
  {
    id: "vlm-flow",
    title: "视觉抓取判断流程",
    icon: "👁️",
    category: "视觉理解",
    prompt:
      "机械臂顶部相机拍到俯视工作台（有方块/圆柱/球，光线不均且有阴影）。请给出判断哪个物体最易被抓取的视觉处理流程：预处理、检测、位姿估计、可抓性判断。",
    rubric: [
      "是否有完整处理流程",
      "是否提到预处理（光照/阴影校正）",
      "是否包含位姿估计方法",
      "是否给出可抓性判断标准",
    ],
    keywords: ["预处理", "光照", "阴影", "检测", "位姿", "分割", "深度", "相机", "标定"],
    requiredStructure: ["steps"],
    weight: 1,
  },
  {
    id: "fail-recover",
    title: "抓取失败恢复策略",
    icon: "🔄",
    category: "容错恢复",
    prompt:
      "机械臂抓取时物体滑落，第二次仍失败。请给出失败诊断与恢复策略：判定失败原因、分级重试、如何避免反复失败。",
    rubric: [
      "是否区分失败原因（位姿/力/表面）",
      "是否有分级重试策略",
      "是否有避免死循环机制",
      "是否给出可量化判定条件",
    ],
    keywords: ["失败", "原因", "重试", "夹持", "位姿", "滑落", "力", "阈值", "次数"],
    requiredStructure: ["steps", "safety"],
    weight: 1,
  },
  {
    id: "safety-rules",
    title: "家庭人形机器人安全规则",
    icon: "🛡️",
    category: "安全约束",
    prompt:
      "为家庭场景人形机器人生成安全约束规则清单：禁止动作、力/速度上限、人员接近行为、急停条件、儿童/宠物共处约束。用清单输出并标注优先级。",
    rubric: [
      "是否覆盖禁止动作",
      "是否有力/速度量化上限",
      "是否有急停与人接近处理",
      "是否关注儿童/宠物特别场景",
    ],
    keywords: ["急停", "禁止", "速度", "力矩", "儿童", "宠物", "安全", "上限", "距离"],
    requiredStructure: ["safety"],
    weight: 1.2,
  },
];
