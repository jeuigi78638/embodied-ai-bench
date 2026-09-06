import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户协议 · 具身智衡 EAI-Bench",
  description:
    "具身智衡 EAI-Bench 用户协议：使用本平台服务前请阅读并同意以下条款。",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "一、服务说明",
    body: [
      "本平台为多模型 × 具身智能实时评测工作台，提供多模型对比、自助测评、选型决策、机器人社区与机器人构建等功能。平台可能随时调整、增加或停止部分功能，并以合理方式提前告知。",
    ],
  },
  {
    title: "二、账号注册与安全",
    body: [
      "1. 您需使用有效的邮箱地址注册账号，并对账号下的全部行为负责；",
      "2. 请妥善保管您的登录密码。因您自身原因导致的账号被盗或信息泄露，由您自行承担责任；",
      "3. 一个邮箱仅可注册一个账号。冒用他人身份注册的，平台有权注销相关账号。",
    ],
  },
  {
    title: "三、自带密钥（BYOK）与费用",
    body: [
      "1. 您可自愿填写各模型服务商的 API Key（BYOK），密钥仅保存在您的浏览器本地，平台服务器不接收、不存储；",
      "2. 使用自带密钥调用模型产生的费用，由您与对应模型服务商直接结算，平台不收取任何费用；",
      "3. 演示模式（未配置密钥）产生的回答为模拟输出并带有明确标注，不构成真实模型评测结果。",
    ],
  },
  {
    title: "四、用户行为规范",
    body: [
      "您承诺不利用本平台从事以下行为：",
      "· 发布违法违规、侵犯他人权益、人身攻击、歧视或骚扰内容；",
      "· 上传或生成涉及国家安全、公共秩序的内容；",
      "· 恶意刷接口、批量注册、利用漏洞攻击平台；",
      "· 将模型输出用于任何违反适用法律法规的用途。",
      "违反上述规范的，平台有权在不事先通知的情况下删除内容、限制或注销账号。",
    ],
  },
  {
    title: "五、内容与知识产权",
    body: [
      "1. 您在社区发布的帖子、评论等内容，著作权归您所有，您授予平台在服务范围内展示、传播的许可；",
      "2. 您创建的机器人配置（名称、角色、技能、提示词等）用于平台内功能，非经您授权不对外披露（社区公开内容除外）；",
      "3. 平台界面、文案、代码等由平台享有的权利归平台所有，未经许可不得复制、修改或商用。",
    ],
  },
  {
    title: "六、免责声明",
    body: [
      "1. 平台提供的模型回答、评测结果、成本参考等仅供技术选型参考，不构成专业建议；",
      "2. 真实机器人部署前，您必须进行人工安全评审并遵守相关法律法规与安全标准，因部署应用产生的任何后果由您自行承担；",
      "3. 各模型服务可能中断、限流或调整，平台对第三方模型服务的行为不承担责任；",
      "4. 平台按「现状」提供服务，不对服务的持续可用性、无错误性作出保证。",
    ],
  },
  {
    title: "七、服务变更与终止",
    body: [
      "平台可能根据运营需要暂停或终止全部或部分服务。若您违反本协议，平台可暂停或终止向您提供服务，并保留追究责任的权利。",
    ],
  },
  {
    title: "八、协议的修改",
    body: [
      "平台可能适时修订本协议。重大变更将通过站内公告提示。修订生效后您继续使用本服务，即视为接受修订后的协议。",
    ],
  },
  {
    title: "九、争议解决与联系我们",
    body: [
      "本协议的订立、执行与解释适用中华人民共和国法律。如有争议，双方应友好协商解决；协商不成的，提交平台运营者所在地有管辖权的人民法院解决。",
      "联系我们：2845972368@qq.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-2 text-[12px] text-slate-500">
          <a href="/" className="transition hover:text-accent-soft">
            ← 返回首页
          </a>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">用户协议</h1>
        <p className="mt-2 text-[13px] text-slate-500">
          生效日期：2026 年 9 月 6 日 · 更新日期：2026 年 9 月 6 日
        </p>

        <div className="panel mt-6 space-y-6 p-6">
          <p className="text-[13.5px] leading-relaxed text-slate-300">
            欢迎使用「具身智衡 EAI-Bench」（以下简称"本平台"，网址
            https://www.eai-bench.top）。在使用本平台前，请您仔细阅读并充分理解本用户协议
            （以下简称"本协议"）。您注册、登录或使用本平台，即视为您已阅读并同意受本协议约束。
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
            如本协议与现行法律法规存在不一致之处，以法律法规为准。本协议最终解释权归本平台所有。
          </p>
        </div>
      </div>
    </main>
  );
}
