# 开发规范

## 产品方向

本应用不是聊天应用，也不是传统后台管理系统。

核心体验：

- 重新进入一个持续运行的 Workspace；
- 看到人、Agent、机器、资源、能力和事件；
- 从 Timeline 回答“刚刚发生了什么”；
- 从 Resource Explorer 进入每个对象；
- 后续通过 Command Palette 创建可审计的操作意图。

## 代码结构

当前结构较小，暂时保持简单：

```text
src/
  App.tsx              顶层 UI 和当前状态编排
  styles.css           当前视觉系统
  tauri.ts             Tauri command 的 TS wrapper 和 browser fallback
  api/
    client.ts          API client 手写薄封装
    schema.ts          从 ../server/openapi.yaml 生成，禁止手改

src-tauri/
  src/main.rs          Tauri commands, SQLite cache, keychain, runtime probe
  tauri.conf.json      Tauri 配置
```

当 `App.tsx` 继续膨胀时，优先拆成：

```text
src/
  components/
    shell/
    workspace/
    resources/
    timeline/
    runtime/
  hooks/
    useAuth.ts
    useWorkspaceState.ts
    useTimeline.ts
    useRuntimeProbe.ts
  api/
  native/
```

拆分只做真实减负，不为了形式化目录而拆。

## API 规则

- 所有后端请求只能从 `src/api/client.ts` 进入。
- `src/api/schema.ts` 只能由 `npm run generate:api` 生成。
- 不允许在组件里直接写散乱 `fetch`。
- 不允许在 UI 里复制后端 DTO 类型。
- 不允许为了 UI 临时字段改 OpenAPI 生成文件。

## Mock 规则

默认禁止 mock。

允许的 fallback 只有两类：

- 浏览器 preview 下的本地缓存 fallback，例如 `tauri.ts` 里使用 `localStorage` 模拟 Tauri native command；
- 明确标注为开发工具的本地 fixture，且不得进入主流程。

Workspace、Resource、Capability、Timeline 这些核心数据必须来自真实 API。

## 样式规则

保持当前方向：

- 黑色背景；
- JetBrains Mono；
- 单色、低饱和、工程控制台感；
- 8px 或更小圆角；
- 信息密度优先；
- 不使用 SaaS 风格大卡片堆叠；
- 不把聊天框放成首页主体；
- 不引入外部 CDN 字体或图片。

交互要求：

- 按钮必须有 hover/focus/disabled 状态；
- 长 ID、地址、错误信息必须截断，不能撑破布局；
- 窗口缩小后不能出现文本溢出到卡片外；
- 高风险动作必须有明确状态反馈和日志。

## Native/Tauri 规则

Native 侧职责：

- SQLite 本地缓存；
- keychain token；
- runtime probe；
- 后续的本机 runtime 安装/检测/修复；
- OS 通知、窗口能力、日志文件。

Native 侧不应该保存：

- 明文后端密码；
- SSH 密码；
- 长期私钥材料；
- 后端权威状态。

## 安全边界

- Token 只通过 native keychain 保存。
- SQLite 只能保存缓存、游标、日志、偏好设置。
- 服务端是权威状态源。
- 本地探测到的 LAN IP 只能作为 hint；远程可达地址必须是 overlay、IPv6 或 relay endpoint。

