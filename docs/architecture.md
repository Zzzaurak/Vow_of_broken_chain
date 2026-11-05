# 当前工程架构

## 页面

- `frontend/src/pages/StartPage`，URL `/`：标题、新建、难度选择、继续和存档入口；通过 PlayerService 建立匿名身份，再访问 AdventureService。
- `frontend/src/pages/GamePage`，URL `/game`：Canvas、HUD、立绘对白、战斗、暂停/失败/结局、援助配置与存读档；剩余验收见 implementation-status.md。

公共传输位于 `src/api/`，业务请求类位于 `src/apis/<同名后端服务>/`。构造无副作用，send 显式序列化业务字段，稳定消息标识统一去除 Message 后缀并转小写，不依赖 constructor.name。

## 后端业务归属

- `services/system`：APIMessage、NoRequestMessage、Endpoint、事务、JDBC 资源和 IOApp。`database` 是共享基础设施目录例外，不含业务 SQL。
- `services/PlayerService`：匿名玩家、随机访问令牌（数据库仅保存 SHA-256 摘要）、可信 PlayerId、进度 revision 与 continue_save。公开 CreateAnonymousPlayerMessage，内部 ResolvePlayerMessage 不注册 HTTP。
- `services/AdventureService`：新冒险、快照校验、保存、读取、轮换和幂等记录。拥有 Adventure、GameSave、ProgressOperation 表。

每个 Table 目录分别保存 Table 与 TableInitializer。公开表方法封装参数、执行和行映射，SQL 保持私有。消息 plan 展示业务顺序，所有写请求在路由边界使用同一连接事务；公开 Table 可以跨服务调用。

## API 对照

所有路由为 `POST /api/{service}/{action}`，错误响应提供 code/message。除创建身份外，Authorization: Bearer 令牌由路由解析为 PlayerId，覆盖任何客户端提交的 playerId。前后端信任边界的字段差异是有意设计。

| 服务 | 消息／前端请求类 | action | 返回 |
| --- | --- | --- | --- |
| PlayerService | CreateAnonymousPlayerMessage | createanonymousplayer | AnonymousPlayerResponse |
| AdventureService | StartAdventureMessage | startadventure | ProgressResponse |
| AdventureService | ListSavesMessage | listsaves | SaveListResponse |
| AdventureService | LoadAdventureMessage | loadadventure | ProgressResponse |
| AdventureService | SaveProgressMessage | saveprogress | ProgressResponse |

审查路径示例：StartPage → StartAdventureMessage.send → Endpoint → StartAdventureMessage.plan → Content.validate + AdventureTable + GameSaveTable + PlayerTable → PostgreSQL。

## 一致性

写入与载入先锁玩家行，再检查操作 ID，最后核对客户端预期 revision。相同 ID/相同请求返回已有结果，不重复写；相同 ID/不同请求报错。保存、手动槽替换、自动历史轮换、continue_save 与幂等结果在同一事务完成。

列表读取也锁定同一玩家行，使 revision、continue_save、冒险和记录来自同一分支；锁保持到路由事务结束，避免多标签写入穿插在多次查询之间。

Load 同样增加 revision，使之前启动的保存请求失效。游戏页 usePersistence 已实现请求代次隔离、串行保存、失败保留重试请求；仍需专项并发浏览器测试。

## 内容

content/world、encounters、characters、story、balance 分别负责地图、遭遇、角色、对白和数值，均为版本化静态配置。后端构建将同一 content 目录打包为资源。build-content.py 从原剧本重建对白，并检查基本地图约束。

游戏不是服务端权威对战；后端验证快照结构与内容一致性，不声称提供反作弊。

## 游戏运行与渲染

GamePage 入口显示 WorldCanvas、GameHud、DialoguePanel、PausePanel 业务骨架。functions 下的 combat/progression/geometry 接收显式输入，不读取 hook、网络或时钟；runtime 封装 Canvas、输入事件、帧循环及图片加载。runtime/store 为页面私有状态边界，对外只提供订阅、快照及更新方法。settings 是跨页偏好，共享于 features。存档记录卡与摘要纯函数位于 features/saves，两个页面直接复用；摘要读取同一地图元数据，不跨页面引用 GamePage 内部模块，也不把可推导的展示重复存入 Zustand。

动作事件在纯模拟中按 fired 标记结算一次，绘制不修改游戏数据。暂停、对白和失败不推进战斗时间。现有图集按其 rect、visibleBounds、脚底 anchor 切帧。敌人和地块原稿位于 material，build-assets.py 仅复制白名单至忽略的 public/assets，build/dev 前自动运行。

## 本轮课程规范审查范围

2026-11-06：已阅读后端 45 个主源文件，按 Scala 技能清单核对服务 1–12、类型 13–19、消息 20–27、路由 28–33、表 34–38，以及跨端和整理规则 48–59。业务对象与响应具有独立文件和伴生编解码器；Endpoint（包含函数）、ApiError（内部异常）是基础设施类型，不作为业务 JSON DTO 派生编解码器。无输入消息与内部身份消息无需增加无用途的传输包装。

本轮发现与处理：

| 依据 | 位置 | 问题与处理 | 验证 |
| --- | --- | --- | --- |
| 同连接事务要求、规则 22／36 | ListSavesMessage | 原先普通查询允许列表读取过程中插入并发写入；改用已有 PlayerTable.lock，与保存／载入统一串行化玩家分支 | 独立 PostgreSQL 连接设置短锁超时，证明读取事务持锁、并发写入被阻挡；读事务结束后原写入成功且返回新版本／指针 |
| 规则 28–29 | Endpoint、PersistenceSuite | 原测试仅覆盖越权读取，不能证明伪造身份和越权保存被拒绝；补足边界证据 | 客户端 playerId 被可信 ID 覆盖；无效令牌返回 401；外来玩家保存失败 |
| 规则 54、工程可读性 | Adventure API 与 Table、前端同名请求类 | 清理编译器确认未用的导入及新建冒险中的空 IO 步骤 | Scala unused-import 编译检查、TypeScript noUnusedLocals／noUnusedParameters 均通过 |

数据库测试现为 12 项，前端单元测试 32 项通过。JDBC 行读取发生在 IO.blocking 内，SQL 和行映射保持 Table 私有，资源与事务由 system 管理；扫描禁用词仅用作定位，最终结论结合逐文件阅读。

前端本轮已审查 api／apis、两个页面入口、StartPage 请求流程、GamePage 存档协调、Zustand 封装及 Tailwind 基础样式；页面纯计算目录未发现读取全局快照或 hook。其余渲染、音频、输入与设置模块仍需完整人工审查，不把本轮静态检查或测试通过当作全项目规范验收完成。
