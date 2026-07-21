# zimu-ai · E2EE Vault

浏览器本地端到端零知识文件加解密工具。  
**完全免费 · 纯静态 · 无后端业务 · 无上传 · Web Crypto API**

仓库：https://github.com/Barsminto/zimu-ai

## 功能

| 能力 | 说明 |
|------|------|
| 本地加密任意文件 → `.enc` | ✅ |
| 本地解密 `.enc` → 原文件名 / MIME / 内容 | ✅ |
| 文件名 / MIME 一并密封 | ✅ |
| 加密输出命名 | `1.jpg` → **`1.enc`** |
| 下载方式 | 处理成功后**手动下载** |
| 单文件体积 | ≤ **50 MB** |
| 登录 / 付费 | 不需要（当前完全免费） |
| 使用说明 / 隐私 / 条款 | 页脚入口，中英双语 |

## 密码学

- **KDF**: PBKDF2-HMAC-SHA-256，**100,000** 次迭代，16 字节随机 Salt  
- **AEAD**: AES-256-GCM，12 字节随机 IV，128-bit Auth Tag  
- **引擎**: `window.crypto.subtle`

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

Ciphertext 明文结构：`metaLen (u32be) | metaJSON {"name","type"} | fileBytes`

## 国际化

- 中文 / English，右上角切换  
- `localStorage` 键：`e2ee-vault-lang`  
- UI、错误提示、使用说明 / 隐私 / 条款均双语  

## 本地预览

```bash
cd zimu-ai
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173/ （勿占用 Hermes 的 8787）

## Cloudflare 部署（Workers 静态资源 · `encfile`）

```toml
name = "encfile"
compatibility_date = "2026-07-21"

[assets]
directory = "."
```

部署命令：`npx wrangler deploy`（**不要**用 `pages deploy`）

## 安全说明

- 密码错误或密文篡改 → AES-GCM 熔断  
- 解密先拷贝明文再 wipe，避免视图被清零  
- 切换模式 / 操作结束清空密码框  
- Cloudflare Web Analytics 仅访问统计，不含文件与密码  

## 许可证

见 `LICENSE`。请遵守当地法律法规使用加密工具。
