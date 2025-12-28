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

## 简单登录示例

- 路由：`/login`，展示一个“Hello”的登录界面（邮箱、密码）
- 接口：`POST /api/login`，返回模拟登录结果（不做真实鉴权）。

## 部署到 Vercel

1. 将项目推送到 Git（GitHub、GitLab 或 Bitbucket）。
2. 打开 https://vercel.com/new ，选择你的仓库。
3. 框架自动识别为 Next.js：
   - Build Command：`next build`
   - Output Directory：`.next`
4. 无需额外配置即可部署。首个部署完成后，Vercel 会提供一个预览域名。
5. 如需环境变量，在 Vercel 项目设置中添加（本项目当前不需要）。

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

## 目录说明（与本次改动相关）

- `app/login/page.tsx`：登录页面（表单直连 `/api/login`）。
- `app/api/login/route.ts`：模拟登录的 API。
- `app/page.tsx`：首页新增了跳转登录按钮。

## 常见问题

- 如果构建失败，请确保 Node 版本在 Vercel 支持范围，并检查 `package.json` 脚本是否为：`dev`, `build`, `start`。
- 自定义域名与 Edge/Node 运行时等高级配置，可稍后在 Vercel 项目设置中添加。
