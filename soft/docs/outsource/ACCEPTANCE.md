# 外包交付验收标准

## 每次 PR / 交付必须通过

```powershell
cd E:\workspace\veic-ui\veic-desktop\soft
npm run check
npm run build
```

如果修改了 `src-tauri`：

```powershell
cd E:\workspace\veic-ui\veic-desktop\soft\src-tauri
cargo check
```

如果交付安装包：

```powershell
cd E:\workspace\veic-ui\veic-desktop\soft
npm run tauri:build
```

## 功能验收

### Auth

- 未登录时不能加载 Workspace；
- 登录错误要显示明确错误；
- 登录成功后能恢复当前用户；
- 重启应用后能恢复 token；
- Logout 后 token 清理。

### Workspace

- 能加载真实 Workspace 列表；
- 能切换 Workspace；
- 切换后 Workspace detail/state/timeline 都同步切换；
- 无 Workspace 时不能显示 mock。

### Runtime resource

- `探测本机` 能填充本机信息；
- 有 overlay 时自动填入 overlay address 和 machineId；
- 没有 overlay/IPv6/relay 时，发布按钮应给出可理解错误；
- 发布成功后 Resource Explorer 能看到资源；
- heartbeat 和 offline 能更新状态。

### Timeline

- 能手动同步；
- Watching 模式能自动轮询；
- 断网或 API 错误时显示错误而不是静默失败；
- 重启后能从本地缓存恢复最近事件；
- 清空只清当前 Workspace 的事件缓存。

### Resource Explorer

- 资源列表按 type 分组；
- 点击资源后展示 identity、endpoint、capability、twin 摘要；
- 长 ID/IP/错误信息不能撑破布局；
- 无资源时显示空状态，不显示假数据。

## UI 验收

必须检查以下窗口宽度：

- 1440px；
- 1280px；
- 1024px；
- 900px；
- 纵向高度低于 760px。

不得出现：

- 文本溢出到面板外；
- 按钮重叠；
- 顶栏状态把窗口按钮挤出；
- 白屏；
- 外部字体 CORS 报错；
- 页面主体变成聊天产品。

## 后端合同验收

- `src/api/schema.ts` 是生成文件；
- API 方法集中在 `src/api/client.ts`；
- 组件不能直接散写 `fetch`；
- 不允许用 mock 填补真实 API 缺口；
- 如果后端返回 400/401/403/404/409，UI 应显示可理解错误。

## 文档验收

每次较大改动必须更新：

- `docs/outsource/CURRENT_STATE.md`；
- 如涉及新后端接口，更新 `docs/outsource/BACKEND_SYNC.md`；
- 如改变路线或百分比，更新 `docs/PROJECT_PLAN.md`。

