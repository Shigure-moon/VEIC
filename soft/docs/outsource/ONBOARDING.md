# 开发环境与启动

## 项目位置

```text
E:\workspace\veic-ui\veic-desktop\soft
```

相关后端：

```text
E:\workspace\veic-ui\veic-desktop\server
```

后端 OpenAPI 合同：

```text
E:\workspace\veic-ui\veic-desktop\server\openapi.yaml
```

## 技术栈

| Layer | Stack |
| --- | --- |
| Desktop | Tauri 2 |
| Native | Rust |
| UI | React 18 + TypeScript + Vite |
| API typing | `openapi-typescript` + `openapi-fetch` |
| Local cache | SQLite via Tauri commands |
| Token storage | Native keychain via Tauri command |
| Default API | `https://api.veic.tech` |

## 安装依赖

```powershell
cd E:\workspace\veic-ui\veic-desktop\soft
npm install
```

本机需要：

- Node.js / npm；
- Rust toolchain；
- Tauri 2 所需 Windows 构建环境；
- 可选：Tailscale CLI，用于本机 overlay 状态探测。

## 常用命令

```powershell
npm run dev
```

只启动 Web preview，地址固定为：

```text
http://127.0.0.1:5188
```

```powershell
npm run tauri:dev
```

启动桌面客户端。

```powershell
npm run check
```

生成 API 类型并做 TypeScript 检查。

```powershell
npm run build
```

生成 API 类型、TypeScript 检查、Vite 生产构建。

```powershell
cd src-tauri
cargo check
```

检查 Rust/Tauri native 侧。

```powershell
npm run tauri:build
```

构建 Windows 安装包。

当前安装包输出位置：

```text
src-tauri\target\release\bundle\nsis\维柯 Runtime_0.1.0_x64-setup.exe
```

## 首次运行流程

1. 启动应用。
2. 确认 `API Base URL` 为 `https://api.veic.tech` 或开发环境地址。
3. 点击 `Health check`。
4. 登录真实账号。
5. 选择真实 Workspace。
6. 点击 `探测本机`。
7. 如果本机有 Tailscale/Headscale overlay 状态，检查 overlay address 和 machineId 是否自动填入。
8. 发布 Runtime Resource。
9. 观察 Timeline 和 Resource Explorer 是否更新。

