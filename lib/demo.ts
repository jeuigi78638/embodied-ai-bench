// ============================================================
// lib/demo.ts — 演示模式（本地模拟回答）
// 用途：未配置任何 API Key 时，让页面仍可完整演示「多模型流式对比」。
// ⚠️ 所有演示输出均带明确标注，非真实模型输出。
// 配置 Key 后关闭演示模式即可获取真实回答。
// ============================================================

import type { ModelConfig } from "./models";

export const DEMO_NOTICE =
  "> 【演示模式】本地模拟回答，非真实模型输出。配置 API Key 后关闭演示模式即可获取真实回答。";

type Category =
  | "grasp"
  | "nav"
  | "ros2"
  | "vlm"
  | "recover"
  | "safety"
  | "generic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- 任务类型识别 ----------
export function classifyPrompt(prompt: string): Category {
  const p = prompt;
  if (/(抓取|机械臂|夹爪|马克杯|杯子|放置|搬运|手爪|吸盘)/.test(p)) return "grasp";
  if (/(导航|移动机器人|底盘|走廊|客厅|厨房|避障|路径规划|AGV)/.test(p)) return "nav";
  if (/(ROS|节点|订阅|话题|scan|cmd_vel|Python|代码|实现一个)/i.test(p)) return "ros2";
  if (/(视觉|相机|图像|识别|检测|俯视|VLM|场景理解|位姿估计)/i.test(p)) return "vlm";
  if (/(失败|恢复|滑落|重试|诊断|error|error handling)/i.test(p)) return "recover";
  if (/(安全|规则|清单|急停|人形机器人|家庭|儿童|宠物|伦理)/.test(p)) return "safety";
  return "generic";
}

// ---------- 各场景核心答案模板（保证横向可比） ----------
const TEMPLATES: Record<Category, string> = {
  grasp: `## 抓取任务分步规划

**目标**：抓取红色马克杯放置到 B 点，避开前方 8cm 高障碍物。

1. **环境感知**：通过顶部/腕部相机确认红色马克杯位姿（中心点 + 朝向），标记障碍物包围盒。
2. **路径规划**：采用 A* / RRT 在关节空间规划抓取路径，路径点与障碍物保持 ≥5cm 安全间距。
3. **抓取姿态**：末端接近方向取杯把侧向，夹爪开度预置 60mm，接近速度为 0.05m/s（低速段）。
4. **执行抓取**：到位后夹爪闭合，检测夹持力（阈值 5N），确认抓稳后再抬起。
5. **转移放置**：抬升到安全高度（距桌面 ≥15cm）→ 移动到 B 点上方 → 慢速下放置。

**安全约束**：
- 全程设置急停条件：夹爪力超阈值 / 检测到人手接近 0.3m 立即停止。
- 最大关节速度限制为额定值的 50%。
- 任何一步失败即回退到安全位姿并报错，禁止盲试。

**关键失败点**：障碍物遮挡导致位姿估计误差 → 对策：抓取前用多视角确认，误差 >3mm 时重新规划。`,

  nav: `## 移动机器人导航决策

**场景**：客厅 → 厨房，走廊可能有行人，厨房门口较窄。

1. **决策框架**（有限状态机）：
   - 巡航 → 检测到行人 → 减速跟随/侧向让行 → 恢复巡航
   - 接近窄门 → 切换慢速模式，必要时让行确认
2. **行人处理策略**：
   - 使用 2D 激光 + 深度相机做人形检测；
   - 行人进入 1.5m 内：减速至 0.1m/s 并停止意图；
   - 行人离开 2m 后恢复原速。
3. **传感器与参数**：
   - 激光雷达（10Hz，检测半径 10m），深度相机（近距离 0.3-5m）；
   - 安全停止距离 0.5m，急停响应 ≤200ms；
   - 最大线速度 0.5m/s，角速度 0.8rad/s。

**安全约束**：速度与距离成反比；检测到紧急接近立即急停并语音提示。`,

  ros2: `## ROS2 激光雷达避障节点

\`\`\`python
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist

STOP_DIST = 0.5   # 正前方障碍距离阈值(m)
FORWARD_SPEED = 0.3  # 前进速度(m/s)

class AvoidNode(Node):
    def __init__(self):
        super().__init__('avoid_node')
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.sub = self.create_subscription(LaserScan, '/scan', self.callback, 10)

    def callback(self, msg):
        twist = Twist()
        # 取正前方 ±30° 范围内的最近距离
        n = len(msg.ranges)
        front = []
        for i in range(n):
            angle = msg.angle_min + i * msg.angle_increment
            if -0.5 <= angle <= 0.5:
                d = msg.ranges[i]
                if d > 0.01 and d < float('inf'):
                    front.append(d)
        if front and min(front) < STOP_DIST:
            twist.linear.x = 0.0   # 停止
        else:
            twist.linear.x = FORWARD_SPEED
        self.pub.publish(twist)

def main():
    rclpy.init()
    node = AvoidNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
\`\`\`

**运行方式**：
- 依赖：\`sudo apt install ros-humble-ros-base\`，Python 包 \`rclpy\`、\`sensor_msgs\`、\`geometry_msgs\`；
- 运行：\`ros2 run my_pkg avoid_node\`（编译后）或 \`python3 avoid_node.py\`。

**安全注意**：正式部署时建议叠加速度斜坡、超时看门狗与急停接口，避免指令丢失导致失控。`,

  vlm: `## 视觉抓取判断流程

**输入**：顶部相机俯视图（方块/圆柱/球，光照不均、有阴影）。

1. **预处理**：灰度化 → 高斯滤波降噪 → 形态学闭运算补洞；对不均匀光照使用自适应直方图均衡化，减少阴影干扰。
2. **目标检测**：使用 YOLO/分割模型输出每个物体的类别与掩膜；对阴影误检用「边缘+高度差」过滤。
3. **位姿估计**：对已分割目标做轮廓拟合 → 计算 2D 中心 + 主轴方向；结合深度图（若可用）估计 3D 位姿；需要时用棋盘格标定相机外参。
4. **可抓性判断**：
   - 遮挡度：目标轮廓可见比例 ≥70%；
   - 顶部可接近性：上方 30cm 无障碍；
   - 表面平整度：深度方差小于阈值（判断是否为规则物体）。
   - 综合评分排序，优先抓"方形、无遮挡、位姿清晰"的物体。

**输出**：最优抓取目标 + 抓取点 + 置信度，供机械臂执行。`,

  recover: `## 抓取失败诊断与恢复策略

1. **失败原因判定**（按优先级排查）：
   - 位姿误差：相机标定/手眼标定偏差 → 复检位姿，误差 >5mm 重新规划；
   - 夹持力不足：物体表面光滑或过重 → 增加夹持力到额定 80% 或更换夹具；
   - 表面材质：低摩擦/易滑动 → 放慢接近速度并改用"包络式"夹持；
   - 环境干扰：气流/振动 → 稳定后重试。
2. **分级重试**：
   - 第 1 次：原方案重试（速度降 30%）；
   - 第 2 次：重新感知 + 重新规划路径；
   - 第 3 次：切换备选抓取策略（不同夹持方向/吸盘）；
   - 超过 3 次：停止并上报人工，避免无效循环。
3. **避免反复失败**：记录每次失败特征到经验库；对同一目标物连续失败 ≥2 次自动触发"感知校验"步骤。

**安全约束**：重试期间保持低速、设定最大尝试次数、异常即急停回退。`,

  safety: `## 家庭人形机器人安全规则清单

| 优先级 | 规则 |
|---|---|
| P0 | 检测到人体/宠物进入工作半径 0.5m，立即停机并保持关节锁定 |
| P0 | 任何时刻可一键急停，急停响应 ≤100ms，急停后进入可人工复位的安全态 |
| P1 | 上肢最大关节力矩限制为 20N·m；与人体交互时 ≤5N·m（力控模式） |
| P1 | 移动速度上限 0.4m/s，室内转弯角速度上限 0.6rad/s |
| P2 | 禁止触碰：人脸部、颈部、伤口、锐器附近；禁止手持刀具类物品 |
| P2 | 儿童/宠物在场时：自动进入"守护模式"（降速 50% + 语音提示） |
| P2 | 热源/水渍地面自动规避；台阶、楼梯边界检测距离 ≥1m 即停止 |
| P3 | 所有动作写日志，异常告警推送；每日自检力控与急停硬件 |

**实施**：以上规则应落地为「软件层约束 + 硬件层急停 + 出厂安全认证」三层保障。`,

  generic: `## 任务分析与执行框架

1. **明确目标**：把任务拆分为「感知 → 决策 → 执行 → 校验」四步闭环。
2. **感知**：确认所需传感器与输入（视觉/力觉/位姿），先做数据校验。
3. **决策**：给出可执行的动作序列，明确每一步的输入输出与判定条件。
4. **执行**：低速起步，带安全阈值与急停，边执行边校验。
5. **校验**：执行后验证结果（到位/抓稳/完成），失败走恢复流程。

**安全约束**：任何物理动作必须有速度/力矩上限、避让人体、异常即停。`,
};

// ---------- 各模型差异化风格 ----------
const MODEL_FLAVOR: Record<
  string,
  { opening: string; closing: string }
> = {
  gpt4o: {
    opening: "（GPT-4o 方案）下面给出结构化、可执行的做法：",
    closing: "> 选型建议：GPT-4o 适合需要强推理与多模态输入的复杂具身任务，成本偏高。",
  },
  claude: {
    opening: "（Claude 3.5 Sonnet 方案）以下是结合安全对齐的做法：",
    closing: "> 选型建议：Claude 在代码与安全规则类任务上表现突出，适合 ROS 开发与安全关键环节。",
  },
  doubao: {
    opening: "（豆包 1.5 Pro 方案）直接给可落地的步骤：",
    closing: "> 选型建议：豆包首字快、成本低、中文好，适合高频实时决策场景。",
  },
  deepseek: {
    opening: "（DeepSeek V3 方案）按逻辑推理分步输出：",
    closing: "> 选型建议：DeepSeek 逻辑强且成本行业最低，适合批量评测与预算敏感场景。",
  },
  qwen: {
    opening: "（通义千问 Qwen-Max 方案）给出完整中文实操方案：",
    closing: "> 选型建议：通义国产生态完善、中文表达好，适合国内团队快速接入。",
  },
  gemini: {
    opening: "（Gemini 2.5 Pro 方案）结合长上下文与多模态理解给出方案：",
    closing: "> 选型建议：Gemini 长上下文与视觉理解强，适合复杂场景描述 → 规划任务。",
  },
  glm4: {
    opening: "（GLM-4 方案）给出均衡、可执行的方案：",
    closing: "> 选型建议：GLM-4 中文与代码均衡、接入简单，适合中小团队。",
  },
};

/** 构造单个模型的演示回答 */
export function buildDemoAnswer(model: ModelConfig, prompt: string): string {
  const cat = classifyPrompt(prompt);
  const flavor = MODEL_FLAVOR[model.id] ?? MODEL_FLAVOR.deepseek;
  return `${DEMO_NOTICE}\n\n${flavor.opening}\n\n${TEMPLATES[cat]}\n\n${flavor.closing}`;
}

/** 演示流式：按小块增量输出，模拟打字机效果 */
export async function* streamDemo(
  model: ModelConfig,
  prompt: string
): AsyncGenerator<string> {
  const answer = buildDemoAnswer(model, prompt);
  const step = 8; // 每块字符数
  for (let i = 0; i < answer.length; i += step) {
    yield answer.slice(i, i + step);
    await sleep(10);
  }
}

/** 演示模式下的确定性延迟（ms） */
export function demoLatency(modelId: string): number {
  const seed = modelId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return 2800 + (seed % 2200);
}
