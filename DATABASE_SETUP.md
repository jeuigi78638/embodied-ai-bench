# EAI-Bench P0 · 数据库配置指南（最后一步：手动，约 5 分钟）

账号系统代码已上线（注册/登录/退出/云端同步 API + 前端弹窗均已部署），
只差「数据库」这一步让登录真正可用。当前未配 DATABASE_URL 时，页面会优雅降级：
登录/注册会提示「数据库未配置」，机器人/帖子仍走本地模式，不影响浏览。

## 需要你在 Vercel 控制台手动操作（约 5 分钟）

### 第 1 步：创建 Postgres 数据库
1. 打开 Vercel 项目 → **Storage**（左侧菜单）
2. 点 **Create Database** → 选 **Postgres**（免费 Hobby 计划可用）
3. 区域建议选 **Washington D.C. (iad1)** 或新加坡（国内访问更快）
4. 点 **Create**，等待创建完成

### 第 2 步：复制连接串
创建完成后进入数据库详情页：
1. 点 **Connect** / **Quickstart** 里的 **.env.local** 标签
2. 复制 `DATABASE_URL="postgresql://..."` 这一行里的**连接串**（不含引号）

### 第 3 步：配环境变量（2 个）
打开 Vercel 项目 → **Settings → Environment Variables**，新增 2 个变量，
Environment 选 **Production**（+ Preview + Development 也勾上更好）：

| Key | Value |
|---|---|
| `DATABASE_URL` | 第 2 步复制的 postgresql:// 连接串 |
| `AUTH_SECRET` | 固定为：`Eum4eT2eTxcLbURN5Tq5tta939HUGz0fog6/tPx4vAE=`（本指南生成的随机密钥，也可自己改） |

保存后 Vercel 会自动触发一次 Redeploy（等 1-2 分钟部署完成）。

### 第 4 步：建表（执行 schema.sql）
在 Vercel Postgres 数据库详情页 → **Query** / **SQL Editor** 标签，
把项目根目录 `schema.sql` 的**全部内容**粘贴进去执行。
成功后会创建 3 张表：`users`（用户）、`robots`（机器人）、`posts`（社区帖子）。

### 第 5 步：验证
1. 打开 https://www.eai-bench.top
2. 右上角点「登录 / 注册」→ 注册一个账号
3. 成功后右上角显示你的昵称，社区/机器人区块变为「已登录 · 云端同步」
4. 换浏览器/换设备再登录，机器人、帖子都在 → **P0 完成**

## 验证方式速查（不用浏览器时）
- 注册：`curl -X POST https://www.eai-bench.top/api/auth/register -H "content-type: application/json" -d '{"email":"a@b.com","password":"123456"}'`
- 登录：`curl -X POST https://www.eai-bench.top/api/auth/login -d '{"email":"a@b.com","password":"123456"}' -c cookies.txt`
- 看自己：`curl https://www.eai-bench.top/api/auth/me -b cookies.txt`
- 发帖：`curl -X POST https://www.eai-bench.top/api/posts -b cookies.txt -d '{"id":"p-1","title":"测试","content":"hi","category":"自由闲聊","createdAt":1700000000000}'`

## 常见问题
- **注册提示「数据库未配置」**：DATABASE_URL 没配好，或部署还没完成，等 redeploy 完再试。
- **注册报错**：去 Vercel 项目 → Logs 看 `register error` 详情；最常见是表还没建（第 4 步没执行）。
- **改了 AUTH_SECRET 后老登录失效**：正常，重新登录即可。
