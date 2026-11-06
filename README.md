# 断链之誓

一款以 AI 娘为角色的单人奇幻冒险。玩家扮演大肥鱼，从东方长阶出发救回 Claude，沿途结识伙伴，在十二张像素地图中探索、战斗和读对白。进度通过 Scala 服务保存到 PostgreSQL，支持刷新继续、手动选档与回到检查点。

从项目根目录执行：

```bash
python3 scripts/run.py
```

启动终端按 **Ctrl-C** 可关闭游戏前后端，数据库保留存档。也可以从项目根目录另开终端执行：

```bash
python3 scripts/run.py status
python3 scripts/run.py stop
python3 scripts/run.py restart
```

重复启动会提示当前实例的地址。restart 在当前终端重新运行；演示构建版用 `python3 scripts/run.py restart --built`。旧版脚本或手动启动的服务需先在各自原终端按 Ctrl-C。

打开 [本地游戏](http://127.0.0.1:5179/)。运行环境与构建版启动方式见[运行与交付](docs/running.md)。

## 账号与游戏操作

标题页右上角提供**注册 / 登录**。可先用游客身份试玩，再注册保留当前进度。在连接同一游戏服务器的其他浏览器登录该账号，即可继续或选择手动存档。

开始或继续冒险时会请求浏览器全屏；浏览器限制全屏时，游戏铺满窗口并保持画面比例。按 **Esc → 帮助** 查看当前预设的全部键位、修改键位或切换浏览器原生全屏。WASD 朝四个方向行走；摆尾与水球跟随瞄准，未指定目标时可以沿移动方向攻击。按住 **Ctrl**（Mac 键盘上的 **Control**）连续快进对白和过场，松开恢复。

## 内容导航

- [验收记录](docs/acceptance.md)：企划 16 项与对应的通关、规则及存档证据。
- [开发 Plan](docs/development-plan.md)：业务边界、12 张地图、8 个遭遇及分阶段验收。
- [运行与交付](docs/running.md)：一键启动、构建版演示、检查脚本与源码打包。
- [素材来源](docs/assets.md)：运行清单、生成记录、原创音频与许可说明。

- [简版企划书 v0.5](material/AI娘冒险游戏_简版企划书.md)：按完整版剧本对齐流程、战斗与检查点，明确 HP／MP 100 和两种难度。
- [完整剧情剧本](material/script.md)：当前剧情与对白依据，包含场景、演出和战斗节点；玩法数值按企划执行。
- [角色设定](material/Character/setting.md)：本游戏的人物性格、剧情职责与技能；按角色目录区分立绘和像素素材。
- [角色素材索引](material/Character/README.md)：四方向站立图、主角动作、伙伴技能、立绘路径与素材状态。
- [动作素材预览](material/Character/animation-preview.html)：本地播放十张新增图集，支持朝向切换、暂停和逐帧查看。
- [CG 使用说明](material/cg/README.md)：cg1、cg2 连续结尾演出与制作参考图的区别。
- [背景参考文字](material/background/background-text.md) 与 [原 PDF](material/background/background-origin.pdf)：仅作参考，游戏主线以完整版剧本为准。
- [课程技能](../course-skills/README.md)：相邻独立仓库中的开发规范；不包含在本仓库内，单独克隆本项目后需另行提供。

## 运行与实现

前端采用 React、TypeScript、Tailwind 与 Canvas 2D。后端在同一 Scala 进程中运行两个逻辑业务服务，使用 Cats Effect、http4s、Circe 和 PostgreSQL。

```text
frontend/src/
├── pages/StartPage/      /      标题、选择难度、继续与选档
├── pages/AccountPage/    /account  注册、登录和退出
├── pages/GamePage/       /game  地图、战斗、对白、菜单与结局
├── features/                    两页共用的设置、音频与存档摘要
├── api/                         公共传输、令牌、路由名
└── apis/                        PlayerService 和 AdventureService 的请求类

backend/src/main/scala/services/
├── PlayerService/               匿名玩家与会话，管理玩家版本和继续指针
├── AdventureService/            冒险、快照、存档轮换与请求去重
└── system/                      进程启动、HTTP 路由基础设施与 JDBC 事务
```

两个业务服务各自包含 api、routes、objects、tables 和 utils。system/database 管理连接与事务。角色、地图、敌人、遭遇和剧情采用共享的版本化内容配置。内容目录、表的归属与课程审查说明见[工程架构](docs/architecture.md)。

| 页面操作 | 服务 | 前后端同名消息 | 结果 |
| --- | --- | --- | --- |
| 首次访问标题页 | PlayerService | CreateAnonymousPlayerMessage | 匿名身份 |
| 注册当前玩家 | PlayerService | RegisterAccountMessage | 注册的用户名 |
| 登录账号 | PlayerService | LoginMessage | 新会话令牌 |
| 退出账号 | PlayerService | LogoutMessage | 撤销当前会话 |
| 新冒险 | AdventureService | StartAdventureMessage | 局内初始快照及版本 |
| 标题或游戏内选档 | AdventureService | ListSavesMessage | 该玩家各冒险、存档列表与继续指针 |
| 继续或读取旧档 | AdventureService | LoadAdventureMessage | 恢复的快照与新版本 |
| 手动或自动保存 | AdventureService | SaveProgressMessage | 已提交的记录与新版本 |

## Git 管理

仓库根为 `hw/hw_m`，默认分支为 `main`，统一管理素材、文档和后续代码。初始提交保留整理前的材料，后续修改另行提交，便于查看差异和回退。

在本目录使用 `git status` 查看工作区，使用 `git log --oneline` 查看历史。提交前检查文件范围与 `git diff --cached --check`，按一次明确的内容修改或功能变更创建提交。

`.gitignore` 排除系统文件、依赖、构建产物、本地数据库和常见凭据文件；`.gitattributes` 将图片、PDF 作为二进制素材管理。新命名的真实凭据文件应补充忽略规则。当前仅建立本地仓库，尚未配置远程。
