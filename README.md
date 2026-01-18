# My Next.js App

## 本地开发

- 安装依赖

```powershell
npm install
```

- 开发模式启动

```powershell
npm run dev
```

访问 http://localhost:3000，首页右下角新增了“Login”按钮，进入简单登录页 `/login`。

- 生产构建

```powershell
npm run build
npm start
```

## 发邮件模块（Gmail）

- 页面：`/send-email`（填写收件人/主题/正文，点击发送）
- 接口：`POST /api/mail/send`

### 环境变量

在本地用 `.env.local`（不要提交到仓库）配置，生产环境在 Vercel 的 Environment Variables 配置。

必填：

```env
GMAIL_USER="your_gmail@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

可选：

```env
MAIL_FROM_NAME="My Next.js App"
MAIL_API_KEY="change_me" # 如果设置了，就需要在请求里带 Authorization: Bearer <key>
```

> Gmail 建议开启两步验证（2FA）并创建 App Password，然后把 App Password 填到 `GMAIL_APP_PASSWORD`。

### 接口请求示例

```http
POST /api/mail/send
Content-Type: application/json
Authorization: Bearer <MAIL_API_KEY>   # 如果你设置了 MAIL_API_KEY

{ "to": "someone@example.com", "subject": "Hello", "text": "Hi" }
```

接口会做基础校验与简单限流（单实例内存级，防止误操作/滥用）。

## 简单登录示例

- 路由：`/login`，展示一个“Hello”的登录界面（邮箱、密码）
- 接口：`POST /api/login`，返回模拟登录结果（不做真实鉴权）。

## 部署到 Vercel

1. 将项目推送到 Git（GitHub、GitLab 或 Bitbucket）。
2. 打开 https://vercel.com/new 选择你的仓库。
3. 框架自动识别为 Next.js：
   - Build Command：`next build`
   - Output Directory：`.next`
4. 无需额外配置即可部署。首个部署完成后，Vercel 会提供一个预览域名。
5. 如需环境变量，在 Vercel 项目设置中添加。

## 数据库（本地与生产）

本地开发默认使用 SQLite：

1. 在项目根目录创建 `.env`（已创建）：
   ```env
   DATABASE_URL="file:./dev.db"
   ```
2. 安装依赖并生成 Prisma Client：
   ```powershell
   npm install
   npm run prisma:generate
   ```
3. 初始化数据表（开发环境迁移）：
   ```powershell
   npm run prisma:migrate
   ```
4. 可选：打开 Prisma Studio 查看数据：
   ```powershell
   npm run prisma:studio
   ```

接口 `/api/login` 会将邮箱与密码（哈希后）写入数据库。若邮箱存在，则更新其密码。

### 在 Vercel 生产环境建议使用 Postgres

1. 在 Vercel 项目中添加环境变量 `DATABASE_URL`，指向托管的 Postgres（例如 Neon、Railway、Supabase 等）。
2. 将 `prisma/schema.prisma` 中的 `datasource db.provider` 改为 `postgresql`，并推送到仓库触发重新部署。
3. 首次部署后，使用迁移初始化生产库（可在本地连接生产库运行）：
   ```powershell
   # 将本地 .env 指向生产库
   $env:DATABASE_URL="<your_production_postgres_url>"
   npm run prisma:generate
   npm run prisma:migrate
   ```

注意：不要在仓库中提交 `.env` 文件；请在 Vercel 控制台设置环境变量。

## 定时计划：每天 10:00 自动发送邮件（复用 /api/mail/send）

项目新增了一个 cron 触发接口：

- `GET /api/cron/daily-mail`

它会在服务端调用现有的 `POST /api/mail/send`（复用所有校验、限流与发信逻辑）。

### 环境变量

新增（必填）：

```env
CRON_API_KEY="change_me_too"  # cron 触发接口鉴权：Authorization: Bearer <CRON_API_KEY>
MAIL_API_KEY="change_me"      # 用于调用 /api/mail/send（建议必须设置）
NEXT_PUBLIC_APP_URL="https://<your-domain>"  # cron 内部调用本服务的绝对地址
```

新增（可选，邮件内容后续你可以再改）：

```env
CRON_MAIL_TO="someone@example.com"
CRON_MAIL_SUBJECT="Daily email"
CRON_MAIL_TEXT="Daily email (content TBD)"
```

新增（可选，抓取 BTC 市场数据用）：

```env
# 用于抓取 Bitcoin Open Interest (USD)。不设置也能发邮件，只是 OI 会显示 N/A 并在 warnings 里提示。
COINGLASS_API_KEY="your_coinglass_api_key"
```

> 邮件正文会在 `CRON_MAIL_TEXT` 之后追加一个 "BTC Daily Snapshot" 区块（best-effort）：
> - BTC 现价：使用 CoinGecko（无 key）
> - BTC ETF 净流入/流出：使用 Farside Investors（公开页面解析，可能会偶尔变更格式）
> - BTC Open Interest (USD)：使用 Coinglass（需要 `COINGLASS_API_KEY`）

### 部署与触发

- 如果部署在 **Vercel**：仓库根目录已添加 `vercel.json`，会按计划请求：
  - `/api/cron/daily-mail?token=<CRON_API_KEY>`
  - 说明：Vercel Cron 通常 **不能自定义请求 Header**，因此这里用 query string 传 token。
  - 注意：Vercel Cron 的调度时间通常按 **UTC** 计算。如果你要“北京时间 10:00”，需要把 schedule 设为 `0 2 * * *`（UTC+8）。

- 如果不是 Vercel（或你想手动触发）：可以用任意外部 scheduler / curl，通过 Header 方式鉴权：
  - `Authorization: Bearer <CRON_API_KEY>` 或 `x-api-key: <CRON_API_KEY>`
  - 也可以直接用 query：`/api/cron/daily-mail?token=<CRON_API_KEY>`

## 目录说明（与本次改动相关）

- `app/login/page.tsx`：登录页面（表单直连 `/api/login`）。
- `app/api/login/route.ts`：模拟登录的 API。
- `app/send-email/page.tsx`：发邮件页面。
- `app/api/mail/send/route.ts`：通过 Gmail SMTP 发邮件的 API。

## 常见问题

- 如果构建失败，请确保 Node 版本在 Vercel 支持范围，并检查 `package.json` 脚本是否为：`dev`, `build`, `start`。
- 自定义域名与 Edge/Node 运行时等高级配置，可稍后在 Vercel 项目设置中添加。
