# zimu-ai · Model Market

模型中转服务商报价目录，使用 Cloudflare Workers 静态资源和 D1 保存商户账户与报价。

## 当前版本

- 公开报价市场：浏览供应商的 GPT-5.6 系列报价，包含输入、缓存写入、输出和缓存读取价格。
- 商户中心：邮箱注册、登录、维护每个模型的一条报价与公开联系方式。
- 注册防护：Cloudflare Turnstile、D1 频率限制、PBKDF2 密码哈希、HttpOnly 会话 Cookie 和待审核商户状态。
- 本地静态预览会继续显示假数据；部署并完成 D1 配置后，市场从 `GET /api/quotes` 读取真实数据。
- 中文 / English 国际化，日间 / 夜间主题切换，夜间主题使用独立高对比度颜色令牌。
- 价格单位：人民币 / 1M Tokens。

## 重要限制

该项目不处理支付或担保交易。商户报价和联系方式由商户维护，上线时应开启待审核注册，并在 Cloudflare 配置 WAF 速率限制规则。

## 本地预览

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

不要使用 `wrangler pages deploy`。现有 Cloudflare Web Analytics beacon 保留在 `index.html`，在页面 `load` 后加载，仅用于页面访问统计；不应将其描述为商户数据或报价数据存储。

完整的 D1、Turnstile 和审核上线步骤见 [docs/D1_AUTH_DEPLOYMENT.md](docs/D1_AUTH_DEPLOYMENT.md)。

## 仓库

https://github.com/Barsminto/zimu-ai
