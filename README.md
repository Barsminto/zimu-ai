# zimu-ai · E2EE Vault（免费版）

浏览器本地端到端零知识文件加解密工具。  
**纯静态 · 无后端 · 无上传 · Web Crypto API only**

仓库：https://github.com/Barsminto/zimu-ai

## 功能

| 能力 | 免费版 |
|------|--------|
| 本地加密任意文件 → `.enc` | ✅ |
| 本地解密 `.enc` → 原文件名 / MIME / 内容 | ✅ |
| 文件名 / MIME 一并密封 | ✅ |
| 加密输出命名 | `1.jpg` → **`1.enc`**（去掉原后缀，仅保留 `.enc`） |
| 下载方式 | **不自动下载**，处理成功后由用户点击「下载」 |
| 单文件体积 | ≤ **50 MB** |
| 登录 / 付费 | 不需要 |
| 大文件流式（≤2GB） | 付费版（未实现） |

## 密码学

- **KDF**: PBKDF2-HMAC-SHA-256，**100,000** 次迭代，16 字节随机 Salt  
- **AEAD**: AES-256-GCM，12 字节随机 IV，128-bit Auth Tag  
- **引擎**: `window.crypto.subtle`（禁止第三方 JS 加密库）

## `.enc` 二进制布局（v1）

```
Offset  Len   Field
0       16    Salt
16      12    IV
28      16    Auth Tag
44      4     Meta Length (uint32 big-endian)
48      N     Meta JSON（公开协议头，如 {"v":1,"sealed":true}）
48+N    …     Ciphertext
```

**Ciphertext** 解密后的明文结构：

```
metaLen (u32be) | metaJSON_utf8 {"name","type"} | fileBytes
```

因此原文件名与 MIME 类型均在 AEAD 保护下，不会以明文出现在容器中。

## 使用流程

### 加密

1. 选择「加密文件」，导入原文件并输入密码（需确认）  
2. 点击开始加密 → 本地生成 `.enc` 结果  
3. **点击「下载」** 保存（例如 `photo.jpg` → `photo.enc`）

### 解密

1. 选择「解密文件」，导入 `.enc` 并输入密码  
2. 点击开始解密 → 校验通过后在内存中还原原文件  
3. **点击「下载」** 保存为原始文件名与格式

> 密码错误或密文被篡改时立即熔断，不会生成可下载结果。

## 国际化（i18n）

- 内置 **中文（zh-CN）** / **English（en）**
- 右上角一键切换，选择写入 `localStorage`（`e2ee-vault-lang`）
- 默认按 `navigator.language` 自动选择（`zh*` → 中文，其余 → English）
- UI 文案、占位符、进度与错误提示均走同一套字典

## 本地预览

```bash
cd zimu-ai
python3 -m http.server 4173 --bind 127.0.0.1
# 或
npx --yes serve -l 4173
```

浏览器打开 http://127.0.0.1:4173/  
Web Crypto 需要 **安全上下文**（HTTPS 或 localhost）。  
请勿占用 Hermes 常用的 `8787` 端口。

## 部署到 Cloudflare Pages

1. 将本仓库根目录作为 Pages 项目根目录（包含 `index.html` 与 `_headers`）  
2. 构建命令留空，输出目录为 `/` 或 `.`  
3. `_headers` 会自动下发 CSP / HSTS 等安全响应头  

```bash
npx wrangler deploy
```

## 表单与隐私

- 切换「加密 / 解密」时会**完整重置**工作区：清空已选文件、密码、进度与待下载结果  
- 密码框禁用浏览器自动填充/记住（`autocomplete=off` + 密码管理器忽略标记）；操作结束后从 DOM 清空  
- **说明**：这能降低“浏览器记住密码 → 他人打开同一浏览器直接填入”的风险，但**不能**防御本机恶意软件、被植入的扩展，或有人能操作你已解锁的浏览器会话。E2EE 的安全前提是设备与浏览器环境可信。


## Cloudflare 部署（Workers 静态资源 · `encfile`）

**不要用** `wrangler pages deploy`（本账户无需 Pages 项目）。  
应部署到已有 Worker **`encfile`**，使用 Workers Assets。

### `wrangler.toml`（必需）

```toml
name = "encfile"
compatibility_date = "2026-07-21"

[assets]
directory = "."
```

- `name` 必须与 Dashboard 中 Worker 名 **encfile** 一致  
- **加解密仍在浏览器完成**，Worker 只托管静态文件  
- `.assetsignore`：排除 `.git` / `src` / 配置等  

### 控制台构建设置

1. 打开 Worker `encfile` → Settings → Builds  
2. **部署命令**改为（不要用 pages deploy）：

```bash
npx wrangler deploy
```

3. 构建命令可留空；生产分支 `main`  
4. 推送代码后自动构建  

### 命令行本地部署

```bash
cd zimu-ai
npx wrangler login
npx wrangler deploy
```

## 安全说明

- 密码错误或密文被篡改时，AES-GCM 校验失败并**立即熔断**，不输出任何明文碎片  
- 解密还原时先 **拷贝** 明文再清理临时 Buffer，避免视图被 `wipe` 误清导致文件损坏  
- 处理后尽量 `fill(0)` 覆盖敏感 `Uint8Array`（`CryptoKey` 不可导出）  
- 静态站无服务端日志；请仍注意设备本身的恶意软件 / XSS 风险  
- CSP 允许 Tailwind CDN 与单页内联脚本；如需更严 CSP，可改为本地构建 CSS + 外链 `app.js` + hash  

## 许可证

见仓库 `LICENSE`。请遵守当地法律法规使用加密工具。
