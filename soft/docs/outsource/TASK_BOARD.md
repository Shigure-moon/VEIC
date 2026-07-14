# 外包任务池

任务优先级以 `P0/P1/P2` 标记。外包团队先做 P0，再做 P1。

## P0 - 稳定交接

### P0.1 拆分 App.tsx

目标：降低后续协作冲突。

建议拆分：

- `components/shell/TitleBar.tsx`
- `components/account/AccountPanel.tsx`
- `components/workspace/WorkspaceList.tsx`
- `components/runtime/RuntimeNodePanel.tsx`
- `components/resources/ResourceExplorer.tsx`
- `components/timeline/TimelinePanel.tsx`
- `components/logs/RuntimeLogPanel.tsx`
- `hooks/useAuth.ts`
- `hooks/useWorkspaces.ts`
- `hooks/useTimeline.ts`
- `hooks/useRuntimeProbe.ts`

验收：

- 行为不变；
- `npm run check` 通过；
- `npm run build` 通过。

### P0.2 API client 补齐只读方法

目标：先补只读，不做高风险执行。

候选：

- list resource capabilities；
- get resource twin；
- list resource twin drifts；
- list invocations；
- list invocation execution events。

验收：

- 只改 `src/api/client.ts`；
- 类型来自 `src/api/schema.ts`；
- UI 使用真实 API。

### P0.3 Resource Detail 强化

目标：让资源对象成为主入口。

内容：

- Endpoint 列表；
- Capability 列表；
- Twin desired/reported/observed；
- Drift；
- Recent invocation。

验收：

- 没有 mock；
- 接口缺失时显示“API not available yet”状态。

## P1 - Workspace Operating Surface

### P1.1 Workspace Search 本地只读版

状态：已完成第一版，等待真实数据窗口尺寸验收。

目标：不是大模型问答，而是搜索本地缓存。

输入：

- Timeline events；
- Workspace state；
- Runtime records；
- Runtime logs；
- Resource/capability text。

输出：

- 命中的 source；
- 时间；
- eventType；
- resource/capability。

验收：

- 不调用 LLM；
- 不编造答案；
- 回答必须能定位来源。

### P1.2 Command Palette 骨架

状态：已完成本地 intent 第一版与 provider policy 只读预检，等待真实 Workspace capability/policy 数据验收。

目标：建立 `Ctrl+K` 操作入口。

第一版只做：

- 搜索 Resource；
- 搜索 Capability；
- 打开 Resource detail；
- 写入本地 command log。
- 拉取 provider policy；
- 展示 disabled provider、role block、risk block、requires session、policy ok 等预检状态。

禁止：

- 直接执行高风险 invocation；
- 绕过后端 policy。

后续：

- server 暴露 command intent API 后，把本地 command log 升级为后端 intent 记录；
- 高风险 capability 进入 Simulation，而不是直接执行。

### P1.3 UI smoke test

状态：已完成 Vitest 第一版，E2E 留到 M9。

目标：减少回归。

建议：

- Vitest + Testing Library DOM smoke；
- API client OpenAPI 生成 / TypeScript check CI 化；
- keychain token 写入 / 恢复 / 清理 mock；
- Workspace list 渲染；
- Workspace state resources / members / sessions 关键字段；
- 401 启动恢复触发 logout state；
- register 201 后 token 写入。

### P1.4 Resource Twin 独立详情页

状态：已完成第一版。

目标：让 Resource Twin 从 Resource Explorer 摘要里独立出来。

第一版只做：

- 展示 desired / reported / observed 分区；
- 展示 Drift Timeline；
- 展示 hydrate 状态和 API error；
- 使用真实 Resource Twin API hydrate 数据；
- 增加组件 smoke。

禁止：

- 更新 desired state；
- 解决 drift；
- 触发 capability invocation。

## P2 - Runtime Integration

### P2.1 Runtime installer/repair 页面

目标：把 Tailscale/Headscale runtime 状态从“检测”推进到“可修复”。

需要后端/安装器策略确认后再做。

### P2.2 MCP / ROS2 / phone 测试入口

目标：给本地 Docker、ROS2 小车、手机测试准备轻入口。

必须依赖真实 API 和测试计划，不做孤立 demo。
