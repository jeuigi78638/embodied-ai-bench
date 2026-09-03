# 具身智衡 EAI-Bench

**多模型 × 具身智能 实时评测工作台** —— 一个把「7 大主流模型实时对比」与「具身智能（机器人）开发」结合起来的在线工具，帮机器人团队 5 分钟看清各模型面对同一具身任务的真实差距，又快又省地完成模型选型。

> 🎮 **演示模式**：未配置任何 API Key 也能完整体验——页面用本地模拟数据流式演示全套功能，配置 Key 后一键切换真实模型。

## ✨ 核心功能

| 模块 | 说明 |
|---|---|
| ① 多模型实时对比 | 1 个指令 → GPT-4o / Claude / 豆包 / DeepSeek / 通义 / Gemini / GLM **7 模型 SSE 并发流式输出**，打字机效果；模型筛选 / 全选 / 系统提示词 / 一键复制 / 清空 |
| ② 具身任务模板库 | 6 类预设：机械臂抓取规划 / 移动机器人导航 / ROS2 代码生成 / 场景视觉理解(VLM) / 失败恢复 / 安全约束规则 |
| ③ 具身安全约束 | 内置「物理安全」系统提示词（急停 / 力控 / 避让 / 儿童宠物），可编辑 |
| ④ 具身专项评测 | 选中 N 模型 × 6 道评测题一键压测，返回逐模型完整回答 + 自动评分 + 排序推荐 |
| ⑤ 选型雷达图 | 6 维能力（任务规划 / 代码 / 视觉 / 安全 / 中文 / 速度）SVG 雷达图，评分可拖动调整 |
| ⑥ 选型决策助手 | 回答机器人类型 / 任务 / 频率 / 预算 → **推荐 Top3 + 理由 + 每日成本测算 + 一键复制选型报告**，直接给老板/客户汇报；报告**自动并入最近一次实测证据**（对比/评测结果），"建议 + 证据" |
| ⑦ 成本速查表 | 各模型 元/百万 token + 首字延迟，供高频实时决策算账 |
| ⑧ 机器人构建专区 | 捏专属具身机器人：定角色 / 点技能 / 选风格 / 绑模型，对话走 BYOK 或演示模式 |
| ⑨ 账号 + 云端同步 | 邮箱注册登录（JWT + Postgres），机器人 / 社区帖子换设备不丢失；未登录优雅降级本地模式 |
| ⑩ 防护机制 | Host/Origin 白名单 + IP 限流 + 参数上限（lib/guard.ts） |

## 🛠 技术栈

- **Next.js 14**（App Router）+ TypeScript + Tailwind CSS（暗色科技风，响应式）
- **Edge Runtime**：`/api/compare`（7 模型并发 SSE 合并）、`/api/benchmark`（批量评测 + 启发式评分）
- **三套上游协议适配**：OpenAI 兼容（GPT-4o/DeepSeek/豆包/通义/GLM）、Anthropic（Claude）、Gemini
- API Key 只存服务端环境变量，**绝不下发浏览器**

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（可选，不配则用演示模式）
cp .env.example .env.local
# 编辑 .env.local，填入你要的模型 Key（先配国产三件套最省：豆包+DeepSeek+通义）

# 3. 启动
npm run dev        # 开发模式 http://localhost:3000
# 或
npm run build && npm run start   # 生产模式
```

打开 http://localhost:3000 即可使用。未配置 Key 时默认进入**演示模式**，可完整体验流式对比与具身评测；配置任一 Key 后取消「演示模式」勾选即为真实模型输出。

## 📁 项目结构

```
embodied-ai-bench/
├── app/
│   ├── page.tsx              # 主页（Header/Hero/对比/评测/雷达/成本）
│   ├── layout.tsx            # 布局 + SEO
│   ├── globals.css           # 暗色科技风样式 + 动画
│   └── api/
│       ├── compare/route.ts  # 多模型并发 SSE（Edge）
│       └── benchmark/route.ts# 具身评测批量跑（Edge）
├── components/
│   ├── CompareWorkbench.tsx  # 对比工作台（模型选择 + 输入 + 流式卡片）
│   ├── BenchmarkSection.tsx  # 具身专项评测
│   ├── RadarSection.tsx      # 选型雷达图
│   ├── CostSection.tsx       # 成本速查
│   ├── Markdown.tsx          # 轻量 Markdown 渲染（无依赖）
│   └── Header / Hero / Footer / ModelCard
├── lib/
│   ├── models.ts             # ★ 模型配置中心（想加模型只改这里）
│   ├── benchmarks.ts         # 具身评测题库 + 评分标准
│   ├── providers.ts          # 三套上游协议流式适配器
│   ├── sse.ts                # 多路流合并为单条 SSE
│   ├── scoring.ts            # 启发式自动评分
│   ├── demo.ts               # 演示模式（无 Key 本地模拟）
│   └── store.ts              # 跨组件实测数据共享（选型报告证据）
├── .env.example              # 环境变量模板
├── vercel.json               # Vercel Edge 配置
├── PRODUCT_SPEC.md           # 产品设计文档
└── DEPLOY_GUIDE.md           # 部署 + 冷启动 + 商业化指南
```

## ➕ 如何新增模型

只需在 `lib/models.ts` 的 `MODELS` 数组里加一个对象（复制现有任意一条改字段）：

- `id`：唯一标识；`name`：展示名；`provider`：协议（openai-compatible 复用 `openai` 协议 / `anthropic` / `gemini`）
- `endpoint`：官方 API 地址；`envKey`：环境变量名
- 在 `.env.example` 中补充对应 Key 说明

前端、API、流式逻辑全部自动适配，无需其他改动。

## 📄 文档

- 产品设计：`PRODUCT_SPEC.md`
- 部署与商业化：`DEPLOY_GUIDE.md`

## ⚠️ 免责声明

- 各模型价格为**参考价**，部署前请以官方定价页为准。
- 具身评测的自动评分为**启发式参考**，真实选型请结合人工评审。
- 模型生成的机器人动作/代码在真实部署前**必须经过人工安全评审**。
