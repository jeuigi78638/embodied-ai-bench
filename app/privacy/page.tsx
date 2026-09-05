import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 · 具身智衡 EAI-Bench",
  description:
    "具身智衡 EAI-Bench 隐私政策：我们如何收集、使用、存储和保护您的个人信息。",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "一、我们收集的信息",
    body: [
      "1. 您主动提供的信息",
      "· 注册与登录：邮箱地址、登录密码（经不可逆加密哈希存储）、昵称；",
      "· 社区内容：您在机器人讨论区发布的帖子、评论、点赞记录；",
      "· 机器人配置：您在机器人构建专区创建的机器人名称、角色、技能、风格、系统提示词及绑定的模型。",
      "2. 使用过程中自动收集的信息",
      "· 设备与网络信息：IP 地址、浏览器类型、访问时间——仅用于安全防护、防滥用限流与服务质量改进。",
      "3. 您自行配置的模型 API Key",
      "· 您通过「API Key」功能自行填写的各模型密钥，仅存储在您浏览器的本地存储（localStorage）中，用于直接请求模型服务商接口。我们的服务器不接收、不存储、不记录、不读取您的 API Key。",
    ],
  },
  {
    title: "二、我们如何使用信息",
    body: [
      "· 提供账号登录与身份认证；",
      "· 实现机器人、社区帖子的云端同步（换设备不丢失）；",
      "· 保障平台安全：识别和阻止滥用、攻击与异常访问；",
      "· 改进产品功能与服务质量。",
      "我们不会将您的个人信息用于与上述目的无关的用途。",
    ],
  },
  {
    title: "三、Cookie 与本地存储",
    body: [
      "· 会话 Cookie：用于维持登录状态（30 天内有效），不包含您的密码；",
      "· 浏览器本地存储（localStorage）：保存您配置的模型 API Key、未登录时的机器人配置与本地帖子数据。您可以随时在浏览器设置中清除。",
    ],
  },
  {
    title: "四、信息的存储与保护",
    body: [
      "· 存储位置：您的账号信息、机器人配置与社区内容存储于本平台委托的境外云服务商（Vercel / Neon Postgres，服务器位于美国）的加密数据库中；",
      "· 安全措施：密码采用 bcrypt 单向哈希存储，会话采用 JWT 签名，数据传输全程使用 TLS 加密；",
      "· 我们采取合理的技术与管理措施保护您的个人信息，但请您理解，互联网环境不存在绝对安全。",
    ],
  },
  {
    title: "五、我们如何共享信息",
    body: [
      "除以下情形外，我们不会向任何第三方共享、出售或出租您的个人信息：",
      "· 获得您的明确同意；",
      "· 依据法律法规或司法机关、行政机关的强制性要求；",
      "· 为保护本平台、用户或公众的合法权益所必需。",
      "您公开发布在社区的内容（帖子、评论）对访客可见，请注意对公开信息的保护。",
    ],
  },
  {
    title: "六、您的权利",
    body: [
      "依据法律规定，您享有以下权利：",
      "· 查询、复制您的个人信息；",
      "· 更正不准确的个人信息；",
      "· 删除您的个人信息（含注销账号）；",
      "· 撤回同意、注销账号。",
      "如需行使上述权利，请通过文末联系方式联系我们，我们将在 15 个工作日内处理。",
    ],
  },
  {
    title: "七、未成年人保护",
    body: [
      "本平台面向机器人开发者与具身智能从业者。我们不会主动收集未满 14 周岁未成年人的个人信息。若您是未成年人，请在监护人指导下使用本平台；若监护人发现未成年人向我们提供了个人信息，请与我们联系，我们将及时删除。",
    ],
  },
  {
    title: "八、本政策的更新",
    body: [
      "我们可能适时更新本政策。重大变更将通过站内公告或显著位置提示。政策更新后，您继续使用本平台即视为接受更新后的政策。",
    ],
  },
  {
    title: "九、联系我们",
    body: [
      "如您对本政策或个人信息处理有任何疑问、意见或投诉，请通过以下方式联系我们：",
      "· 邮箱：2845972368@qq.com",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-2 text-[12px] text-slate-500">
          <a href="/" className="transition hover:text-accent-soft">
            ← 返回首页
          </a>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">隐私政策</h1>
        <p className="mt-2 text-[13px] text-slate-500">
          生效日期：2026 年 9 月 5 日 · 更新日期：2026 年 9 月 5 日
        </p>

        <div className="panel mt-6 space-y-6 p-6">
          <p className="text-[13.5px] leading-relaxed text-slate-300">
            欢迎使用「具身智衡 EAI-Bench」（以下简称"本平台"，网址
            https://www.eai-bench.top），本平台为多模型 × 具身智能实时评测工作台。
            我们深知个人信息对您的重要性，将尽全力保护您的个人信息安全。本政策依据
            《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》等法律法规制定，
            帮助您了解我们如何处理您的个人信息。
          </p>

          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-[15px] font-semibold text-slate-100">{s.title}</h2>
              <div className="space-y-1 text-[13px] leading-relaxed text-slate-400">
                {s.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>
          ))}

          <p className="border-t border-bg-border/60 pt-4 text-[12px] text-slate-600">
            如本政策与现行法律法规存在不一致之处，以法律法规为准。本政策最终解释权归本平台所有。
          </p>
        </div>
      </div>
    </main>
  );
}
