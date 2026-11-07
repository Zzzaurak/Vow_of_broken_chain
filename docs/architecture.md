# 当前工程架构

## 页面

- `frontend/src/pages/StartPage`，URL `/`：标题、新建、难度选择、继续和存档入口；通过 PlayerService 建立匿名身份，再访问 AdventureService。
- `frontend/src/pages/AccountPage`，URL `/account`，访问 PlayerService 注册当前游客、登录已有账号或退出当前会话。账号以原玩家 ID 关联存档。
- `frontend/src/pages/GamePage`，URL `/game`：Canvas、HUD、立绘对白、战斗、暂停/失败/结局、援助配置与存读档；剩余验收见 implementation-status.md。

公共传输位于 `src/api/`，业务请求类位于 `src/apis/<同名后端服务>/`。构造无副作用，send 显式序列化业务字段，稳定消息标识统一去除 Message 后缀并转小写，不依赖 constructor.name。

## 后端业务归属

- `services/system`：APIMessage、NoRequestMessage、Endpoint、事务、JDBC 资源和 IOApp。`database` 是共享基础设施目录例外，不含业务 SQL。
- `services/PlayerService`：匿名玩家、随机访问令牌（数据库仅保存 SHA-256 摘要）、可信 PlayerId、进度 revision 与 continue_save。公开 CreateAnonymousPlayerMessage，内部 ResolvePlayerMessage 不注册 HTTP。
- `services/AdventureService`：新冒险、快照校验、保存、读取、轮换和幂等记录。拥有 Adventure、GameSave、ProgressOperation 表。

每个 Table 目录分别保存 Table 与 TableInitializer。公开表方法封装参数、执行和行映射，SQL 保持私有。消息 plan 展示业务顺序，所有写请求在路由边界使用同一连接事务；公开 Table 可以跨服务调用。

## API 对照

所有路由为 `POST /api/{service}/{action}`，错误响应提供 code/message。除创建身份与登录外，Authorization: Bearer 令牌由路由解析为 PlayerId，覆盖任何客户端提交的 playerId。前后端信任边界的字段差异是有意设计。

| 服务 | 消息／前端请求类 | action | 返回 |
| --- | --- | --- | --- |
| PlayerService | CreateAnonymousPlayerMessage | createanonymousplayer | AnonymousPlayerResponse |
| PlayerService | RegisterAccountMessage | registeraccount | 用户名 |
| PlayerService | LoginMessage | login | 新令牌 |
| PlayerService | LogoutMessage | logout | 会话撤销结果 |
| PlayerService | GetAdministratorMessage | getadministrator | 管理员布尔标记 |
| AdventureService | StartAdventureMessage | startadventure | ProgressResponse |
| AdventureService | ListSavesMessage | listsaves | SaveListResponse |
| AdventureService | LoadAdventureMessage | loadadventure | ProgressResponse |
| AdventureService | SaveProgressMessage | saveprogress | ProgressResponse |

审查路径示例：StartPage → StartAdventureMessage.send → Endpoint → StartAdventureMessage.plan → Content.validate + AdventureTable + GameSaveTable + PlayerTable → PostgreSQL。

## 一致性

写入与载入先锁玩家行，再检查操作 ID，最后核对客户端预期 revision。相同 ID/相同请求返回已有结果，不重复写；相同 ID/不同请求报错。保存、手动槽替换、自动历史轮换、continue_save 与幂等结果在同一事务完成。

列表读取也锁定同一玩家行，使 revision、continue_save、冒险和记录来自同一分支；锁保持到路由事务结束，避免多标签写入穿插在多次查询之间。

Load 同样增加 revision，使之前启动的保存请求失效。游戏页 usePersistence 已实现请求代次隔离、串行保存、失败保留重试请求；浏览器用例验证旧响应延迟、提交后断线、回档和跨标签冲突恢复。

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

JDBC 行读取发生在 IO.blocking 内，SQL 和行映射保持 Table 私有，资源与事务由 system 管理；扫描禁用词仅用作定位，最终结论结合逐文件阅读。

前端按 React 清单复核了以下边界。

| 课程规则 | 对应实现与检查 |
| --- | --- |
| 19、60 | 游戏模式与暂停前的模式使用判别联合。存档以阶段值区分剧情与可恢复检查点，设置界面临时选项就近维护。 |
| 28–33、48–53 | 公共传输添加令牌，请求类显式发送字段。messages.test.ts 检查稳定消息名、无输入及错误路径。八个公开消息及页面对应关系见根 README。 |
| 39–47 | 页面入口组合具体业务区域。Canvas 绘制和即时输入归 GamePage，跨页共享的设置、音频和存档摘要归 features。场景计算接收显式参数，React 组件按选择器订阅。 |
| 54–59 | 页面和菜单使用 Tailwind，公共 CSS 仅定义主题与基础样式。战斗动画与像素绘制由 Canvas 承担；进度条等运行时尺寸由实际数据计算。类型检查、格式与生产构建包含在检查脚本中。 |

音频边界审查补充：AudioLifecycle 负责用户手势、窗口焦点和可见性监听；engine 保持私有 AudioContext／节点／计时器，外部只调用明确操作。音乐暂停与窗口失焦分别建模，避免每帧 setSoundtrack 覆盖失焦状态。焦点／静音经 master 增益淡出，暂停经 music 增益淡出，音效通道仍支持菜单试听；资源销毁清理计时器和 AudioContext。真实 WebAudio 幅度检查与模拟时钟测试证明门控路径，实际听音仍为单独验收项。


## 区域探索与存档

当前 25 个区域的几何与内容连接分别位于 maps.json、exploration.json。地图数组不表示推进顺序。区域、出口、机关和宝物通过稳定 ID 和前置条件连接；GamePage 的 exploration 纯函数推导碰撞、可通行状态与成长，私有运行态 store 保存当前快照和动画。

安全快照扩展 ExplorationProgress（visited／flags／collected）。数据库继续保存原有 JSONB 快照，不新增独立角色或地图服务。AdventureService 内的 RegionDefinition、MapExit、ExplorationPoint、GrowthItem 是内容模型，各自文件中提供 Circe 编解码器。LoadAdventureMessage 在同一事务中先升级旧内容快照、再校验、最后更新继续指针与版本；旧存档行不被迁移过程覆盖。

新版剧本接入：4-C1 在雪线针叶林首次到达播放；击破圣光图腾打开前哨出口。4-C2 由前哨营火首次调查触发，恢复资源并在对白结束后自动保存。5-5 在逃亡过场后、CG1 前播放，沿用 ending 安全快照，重载从悬崖对白开始。新增区域不修改旧区域碰撞或旧存档必需条件，保留 2.0.0 内容兼容。

管理员链路：GamePage → GetAdministratorMessage 请求类 → 后端同名消息 → AccountTable.isAdministrator。身份由现有认证路由注入，忽略客户端伪造 playerId；注册不接收角色字段。管理员控制只影响本地运行态，GameSnapshot 与保存协议不变。音乐文件通过 MediaElementSource 接入现有 music GainNode，保持统一静音、暂停和失焦边界；停止时清理媒体源与音频节点。
