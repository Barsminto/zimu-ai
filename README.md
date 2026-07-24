# zimu-ai · Model Market

模型中转服务商报价目录，使用 Cloudflare Workers 静态资源和 D1 保存商户账户与报价。

## 当前版本

- 公开报价市场：浏览供应商的 GPT-5.6 系列报价，包含输入、缓存写入、输出和缓存读取价格。
- 商户中心：邮箱注册、登录、维护每个模型最多两个渠道，支持上架、下架、恢复和永久删除。
- 管理后台：管理员维护品牌和模型，暂停/恢复或删除商户，治理渠道并查看审计日志。
- 注册防护：Cloudflare Turnstile、D1 频率限制、PBKDF2 密码哈希和 HttpOnly 会话 Cookie。
- 市场目录从 `GET /api/catalog` 和 `GET /api/quotes` 读取 D1 中的真实数据；没有自动生成的前端假数据。
- 中文 / English 国际化，日间 / 夜间主题切换，夜间主题使用独立高对比度颜色令牌。
- 价格单位：人民币 / 1M Tokens。

## 重要限制

该项目不处理支付或担保交易。商户报价和联系方式由商户维护。下架是可恢复的软删除，删除会保留审计快照但不保留业务记录。

## 本地预览

如需使用真实的 Worker API 和本地 D1 数据库，先执行迁移和测试数据 Seed：

```bash
npx wrangler d1 migrations apply model-market-db --local
npx wrangler d1 execute model-market-db --local --file seeds/local-test-data.sql --yes
npx wrangler dev --local --port 4186
```

Seed 可以重复执行，不会产生重复商户或报价。它只用于本地开发，**不要为该文件添加 `--remote`**。生产演示数据必须单独使用 `seeds/production-demo-data.sql`，不会随部署自动导入。

本地测试账号：

| 商户 | 邮箱 | 状态 |
|---|---|---|
| Aurora API | `aurora@example.test` | 已激活 |
| Northstar Relay | `northstar@example.test` | 已激活 |
| Lattice Cloud | `lattice@example.test` | 已激活 |
| Pending Sandbox | `pending@example.test` | 待审核 |

四个账号的本地测试密码均为 `LocalDemo2026!`。

如果只需查看静态页面，可以继续使用简单 HTTP 服务：

```bash
cd zimu-ai
python3 -m http.server 4186 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4186/`。端口 4186 用于避免与其他本地服务冲突。

## 重新生成 CSS

```bash
npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i tailwind.input.css -o styles.css --minify
```

## Cloudflare 部署

`wrangler.toml` 使用 Workers 静态资源模式。首次部署前必须创建 D1、填入数据库 UUID、设置 Turnstile 和 Worker Secrets：

```toml
name = "encfile"
main = "src/index.js"
compatibility_date = "2026-07-21"

[assets]
directory = "."
```

部署命令：

```bash
npx wrangler deploy
```

首次上线或更新业务表结构时，先单独应用迁移，再部署 Worker：

```bash
npx wrangler d1 migrations apply model-market-db --remote
npx wrangler deploy --keep-vars
```

初始化管理员账号（不会通过公开注册创建管理员）：

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='ChangeMe2026!' node scripts/bootstrap-admin.mjs --local
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='ChangeMe2026!' node scripts/bootstrap-admin.mjs --remote --confirm-remote
```

如需上线演示数据，必须由操作人员显式执行；清理时按 SQL 文件末尾注释执行删除语句：

```bash
npx wrangler d1 execute model-market-db --remote --file seeds/production-demo-data.sql --yes
```

不要使用 `wrangler pages deploy`。现有 Cloudflare Web Analytics beacon 保留在 `index.html`，在页面 `load` 后加载，仅用于页面访问统计；不应将其描述为商户数据或报价数据存储。

完整的 D1、Turnstile 和审核上线步骤见 [docs/D1_AUTH_DEPLOYMENT.md](docs/D1_AUTH_DEPLOYMENT.md)。

## 仓库

https://github.com/Barsminto/zimu-ai
