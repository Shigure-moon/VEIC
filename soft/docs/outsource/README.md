# VEIC Runtime Desktop 外包开发交接

本目录是 `soft` Tauri 实验客户端的外包开发入口。外包团队只需要围绕本应用推进，不需要理解或维护历史的 `portal-tunneler`、`user-desktop`、`engineer-desktop`。

当前目标不是做一个完整 SaaS 控制台，也不是聊天应用，而是一个面向 Agent Runtime 的桌面实验客户端：

```text
Workspace first.
Timeline first.
Real backend only.
No mock data.
```

## 外包范围

允许外包团队负责：

- React/Tauri 桌面应用 UI 与交互实现；
- 基于真实 API 的 Workspace、Resource、Timeline、Runtime Log、Health Check、Resource Explorer；
- 本地 SQLite 缓存、窗口状态、日志、偏好设置等客户端能力；
- API Client 层适配，但必须从 `../server/openapi.yaml` 生成类型；
- 视觉和布局打磨，但必须保持 `veicApiWeb` 的黑色、单色、工程控制台风格。

不建议外包团队直接负责：

- `server` 后端领域模型设计；
- 数据库 schema 决策；
- Headscale/Relay/MCP Gateway 生产级实现；
- 权限、安全策略、审计语义；
- Agent Runtime 的长期模型裁剪。

如果前端实现需要新增后端能力，必须按 [BACKEND_SYNC.md](BACKEND_SYNC.md) 提交接口需求，不允许在前端自行 mock 长期接口。

## 必读文档顺序

1. [ONBOARDING.md](ONBOARDING.md)
2. [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
3. [BACKEND_SYNC.md](BACKEND_SYNC.md)
4. [BACKEND_UPDATE_LOG.md](BACKEND_UPDATE_LOG.md)
5. [ACCEPTANCE.md](ACCEPTANCE.md)
6. [CURRENT_STATE.md](CURRENT_STATE.md)
7. [../PROJECT_PLAN.md](../PROJECT_PLAN.md)
8. [../c4/ARCHITECTURE.md](../c4/ARCHITECTURE.md)

## 当前进度

- 当前 `soft` 桌面应用 MVP：约 42%。
- 完整 P3 Agent Runtime 桌面愿景：约 24%。

这两个百分比不要混用。外包团队近期只需要推进桌面 MVP，不需要一次性实现完整 P3 蓝图。

## 交付原则

- 每次交付必须能运行 `npm run check`。
- 涉及 Tauri/Rust 时必须能运行 `cargo check`。
- 发布安装包前必须运行 `npm run tauri:build`。
- 所有 API 变更必须先同步 OpenAPI，再生成 `src/api/schema.ts`。
- 不允许把 demo mock 当作真实功能提交。
- 不允许引入大而重的状态管理库，除非先说明必要性。
- 不允许把首页改成聊天窗口。
