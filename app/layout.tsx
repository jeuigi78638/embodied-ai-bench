import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "具身智衡 EAI-Bench · 多模型 × 具身智能实时评测工作台",
  description:
    "一个把多模型实时对比与具身智能（机器人）开发结合起来的在线评测工作台：7 大主流模型并发流式对比，内置机械臂规划 / 导航 / ROS2 代码 / 视觉理解等具身任务模板与安全约束，帮助机器人团队又快又省地完成模型选型。",
  keywords: [
    "具身智能",
    "多模型对比",
    "GPT-4o",
    "Claude",
    "豆包",
    "DeepSeek",
    "通义千问",
    "Gemini",
    "GLM",
    "机器人",
    "机械臂",
    "ROS2",
    "模型评测",
  ],
  openGraph: {
    title: "具身智衡 EAI-Bench",
    description: "7 大模型并发流式对比，专为具身智能开发打造的评测工作台",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070B14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
