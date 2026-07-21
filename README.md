# zimu-ai · E2EE Vault（免费版）

浏览器本地端到端零知识文件加解密工具。  
**纯静态 · 无后端 · 无上传 · Web Crypto API only**

## 功能

| 能力 | 免费版 |
|------|--------|
| 本地加密任意文件 → `.enc` | ✅ |
| 本地解密 `.enc` → 原文件 | ✅ |
| 文件名 / MIME 一并密封 | ✅ |
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

## 国际化（i18n）

- 内置 **中文（zh-CN）** / **English（en）**
- 右上角一键切换，选择写入 `localStorage`（`e2ee-vault-lang`）
- 默认按 `navigator.language` 自动选择（`zh*` → 中文，其余 → English）
- UI 文案、占位符、进度与错误提示均走同一套字典

## 本地预览

```bash
cd e2ee-vault
# 任选其一
python3 -m http.server 4173
# 或
npx --yes serve -l 4173
```

浏览器打开 `http://localhost:4173`。  
Web Crypto 需要 **安全上下文**（HTTPS 或 localhost）。

## 部署到 Cloudflare Pages

1. 将本目录作为 Pages 项目根目录（包含 `index.html` 与 `_headers`）
2. 构建命令留空，输出目录为 `/` 或 `.`
3. `_headers` 会自动下发 CSP / HSTS 等安全响应头

```bash
# 使用 Wrangler 直接发布
npx wrangler pages deploy . --project-name=e2ee-vault
```

## 安全说明

- 密码错误或密文被篡改时，AES-GCM 校验失败并**立即熔断**，不输出任何明文碎片  
- 处理后尽量 `fill(0)` 覆盖敏感 `Uint8Array`（`CryptoKey` 不可导出）  
- 静态站无服务端日志；请仍注意设备本身的恶意软件 / XSS 风险  
- CSP 允许 Tailwind CDN 与单页内联脚本；如需更严 CSP，可改为本地构建 CSS + 外链 `app.js` + hash

## 许可证

仅供学习与自用部署。请遵守当地法律法规使用加密工具。
