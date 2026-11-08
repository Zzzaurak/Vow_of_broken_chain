# 断链之誓

一款以 AI 娘为角色的单人奇幻冒险。玩家扮演大肥鱼，从东方长阶出发救回 Claude，沿途结识伙伴，在 25 张像素地图中探索、战斗和读对白。进度通过 Scala 服务保存到 PostgreSQL，支持刷新继续、手动选档与回到检查点。

在项目根目录启动：

| 平台 | 命令 |
| --- | --- |
| macOS / Linux | `python3 scripts/run.py` |
| Windows | `py scripts/run.py` |

打开 [本地游戏](http://127.0.0.1:5179/)。启动终端按 **Ctrl-C** 关闭前后端，数据库与存档保留。命令末尾加 `status`、`stop` 或 `restart` 可管理当前实例，加 `--built` 可运行构建版。重复启动会显示已有实例的地址。

依赖安装、数据库管理、验证与打包见[运行与交付](docs/running.md)。

## 账号与游戏操作

标题页右上角提供**注册 / 登录**。可先用游客身份试玩，再注册保留当前进度。在连接同一游戏服务器的其他浏览器登录该账号，即可继续或选择手动存档。

开始或继续冒险时会请求浏览器全屏；浏览器限制全屏时，游戏铺满窗口并保持画面比例。按 **Esc → 帮助** 查看当前预设的全部键位、修改键位或切换浏览器原生全屏。WASD 朝四个方向行走；摆尾与水球跟随瞄准，未指定目标时可以沿移动方向攻击。按住 **Ctrl**（Mac 键盘上的 **Control**）连续快进对白和过场，松开恢复。

## 内容导航

- [验收记录](docs/acceptance.md)：企划 16 项与对应的通关、规则及存档证据。
- [开发 Plan](docs/development-plan.md)：首版业务边界与阶段验收；当前探索改造见下方区域说明。
- [运行与交付](docs/running.md)：一键启动、构建版演示、检查脚本与源码打包。
- [课程演示与提交](material/Demo/README.md)：三分钟内的使用流程、普通话女声解说文案、录制与限额打包脚本。
- [素材来源](docs/assets.md)：运行清单、生成记录、原创音频与许可说明。
- [简版企划书 v0.5](material/AI娘冒险游戏_简版企划书.md)：按完整版剧本对齐流程、战斗与检查点，明确基础 HP／MP 100、探索成长和两种难度。
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
| 游戏内管理员开关 | PlayerService | GetAdministratorMessage | 后端认证的管理员标记 |
| 新冒险 | AdventureService | StartAdventureMessage | 局内初始快照及版本 |
| 标题或游戏内选档 | AdventureService | ListSavesMessage | 该玩家各冒险、存档列表与继续指针 |
| 继续或读取旧档 | AdventureService | LoadAdventureMessage | 恢复的快照与新版本 |
| 手动或自动保存 | AdventureService | SaveProgressMessage | 已提交的记录与新版本 |

## Git 管理

仓库根为 `hw/hw_m`，默认分支为 `main`，统一管理代码、素材与文档。使用 `git status` 查看工作区、`git log --oneline` 查看历史；提交前检查 `git diff --cached --check`。

`.gitignore` 排除依赖、构建产物、本地数据库及凭据；源码打包仅导出已跟踪文件，详见[运行与交付](docs/running.md)。

## 环境与技术细节

macOS 与 Windows 共用启动器和数据库脚本。下表为已使用的环境，项目依赖以锁文件和构建配置为准；验证范围见[验收记录](docs/acceptance.md)。

| 部分 | 当前环境／固定配置 |
| --- | --- |
| 系统 | macOS、Windows 11 |
| Node.js | macOS 24.19.0、Windows 24.14.1；npm 依赖由 frontend/package-lock.json 固定 |
| 前端 | React 19.3.1、TypeScript 5.7.3、Vite 6.4.5、Tailwind 4.3.3、Zustand 5.0.16 |
| JVM | macOS 本机 OpenJDK 27，Windows 验收用 Temurin 21；Scala 3.3.5、sbt 1.10.7 由 backend 配置固定 |
| 后端 | Cats Effect 3.6.3、http4s 0.23.30、Circe 0.14.10、PostgreSQL JDBC 42.7.5 |
| Python | macOS 3.13.15、Windows 3.13.0；运行和内容构建脚本使用标准库 |
| 数据库 | 本机 PostgreSQL 18.6；开发库 oath，测试库 oath_test |
| 浏览器检查 | Playwright Chromium；在 frontend 执行 npx playwright install chromium 安装测试浏览器 |

前端监听 127.0.0.1:5179，将 /api 代理到 Scala 的 127.0.0.1:8093。Canvas 使用 960×540 逻辑坐标并等比缩放，输入转换回世界坐标。地图地块为 32 像素，物理模拟为固定 60Hz。对白与暂停冻结战斗计时。

数据库连接由 DATABASE_URL、PGUSER、PGPASSWORD 指定，URL 为 JDBC 格式，例如 jdbc:postgresql://127.0.0.1:55439/oath。未设置连接时，启动器初始化项目独立的 .local/postgres，仅监听本机，开发用户为 oath。OATH_PGPORT 可调整该数据库的端口。Scala 的 PORT 可调整 HTTP 端口，但启动器和 Vite 代理约定 8093，变更时需一并修改调用侧。

素材原稿在 material，场景、敌人、剧情与数值在 content。build-assets.py 将白名单素材复制至 frontend/public/assets；build-content.py 从剧本提取对白并校验内容引用和地图可达性。npm dev/build 自动复制素材。Scala 构建把同一份 content 打入资源目录，内容变更后需要重启后端。数据库表在后端启动时初始化。

技能、敌人基础数值和法阵参数在 [combat.json](content/balance/combat.json)。技能释放、命中和敌人行动在 [combat.ts](frontend/src/pages/GamePage/functions/combat.ts)，招式类型与施法间隔在 [enemyAttack.ts](frontend/src/pages/GamePage/functions/enemyAttack.ts)，各关的敌人与波次在 [encounters.json](content/encounters/encounters.json)。

GPT 援助按大肥鱼当前朝向，在前方 90°、440 像素范围内选择最近存活敌人，在选定位置造成范围伤害。无目标时提示并保留 CD。沿蓝色箭头走入围墙缺口切换区域；各区域支持多方向连接与回访，灰色箭头表示需要剧情线索或机关。

## 修改后的验证

macOS / Linux 执行 `bash scripts/check.sh`；前后端已启动时可加 `--browser`。Windows 的分步命令与完整试玩方式见[运行与交付](docs/running.md#验证)。Agent 接手说明见 [AGENTS.md](AGENTS.md)。

## 非线性区域探索（内容版本 2.1.0）

按扩展剧本重构为 25 张小地图。主线仍有剧情先后，但区域内能选择先逛哪条岔路，也能返回已探索地点。后山瀑布、市集后院、琉璃矿洞、废船坞、干涸河床、冰封古殿和教堂双翼分别提供宝物、NPC 或环境线索。龙巢之后增加雪线针叶林与荒原前哨：击碎圣光图腾解除光网，在营火旁分食米饭、整备后进入圣都。渡海与最终逃离是单向剧情边界。

靠近人物、路牌、宝箱、营火或机关按当前交互键（默认 F）；荆棘与冰封用摆尾或水球打破。船坞横梁必须通过隐藏梯子上下，水闸移到原浮桥处，一次交互开放东侧道路和仓库；冰殿断墙只能通过冰台往返，玄冰与雨林荆棘封住各自宝箱入口。野外靠近守卫会进入战斗，Boss 场地交互开战。暂停菜单新增“手记”，可查通路、成长和走过的区域；右上角小地图标记通路与已接近的宝箱。

| 宝物 | 每份效果 |
| --- | --- |
| 饱满灵谷 | HP 上限 +20，并恢复至新上限 |
| 深海润珠 | MP 上限 +20，MP 回复每秒 +0.5 |
| 鲸纹硬鳞 | 基础摆尾伤害 +15% |
| 纯净潮汐核心 | 基础水球伤害及爆炸半径各 +20% |

同类效果按份数累加，不额外改变援助技能。营地回满成长后的资源、重置冷却并形成检查点。宝箱与机关保存唯一 ID，回访不会重复发放；主动读旧档则忠实恢复那条时间线的成长与探索状态。

技术入口：maps.json 管理几何与主线遭遇；world/exploration.json 管理连接图与调查点；balance/growth.json 管理成长；GamePage/functions/exploration.ts 负责条件、动态碰撞和成长计算，progression.ts 负责交互与旅行。后端 Content.validate 按前置条件、记录来源和实际成长上限验证，不再要求完成数组中所有前置地图。原两个服务与 API 不变。

读取 1.1.0 存档时按旧主线转换必要标记，港镇旧 Boss 存档移到仓库，不赠送可选成长道具。原数据库记录保持原样，后续保存才写入 2.1.0。2.0.0 旧档若停在雨林、船坞或冰殿，载入时回到该图安全出生点，HP、MP、冷却与宝物均保留；旧浮桥标记移除。具体设计和实现验收范围见 [探索改造计划](docs/exploration-plan.md)。

## 本地管理员与音乐

管理员登录后，在游戏暂停菜单的「旅途」页勾选「无敌」「秒杀」。无敌免疫伤害，秒杀在攻击命中时生效并保留分波与 Boss 剧情。开关默认关闭，仅保存在本次运行态，不写入存档；伤害结算为浏览器本地模拟，不作为多人对战反作弊边界。普通注册不赋予管理员身份。

本机账号凭据保存在忽略的 `.local/admin-account.json`，不打包、不提交。需要在新的本地开发库创建时，先启动后端，再运行 `python3 scripts/provision-admin.py`；已有同名账号且没有本地凭据时拒绝覆盖。管理员属性存于 `player_accounts.is_admin`，旧数据库启动时补齐默认 false 的列。

BGM 原为四组手写音符的 WebAudio 合成音乐。现优先播放 `material/Music` 的四首腾讯云 MiniMax 生成纯音乐，探索、战斗、北境、重逢分别切换。音量、静音、暂停与失焦控制继续有效，加载失败时保留原合成音乐回退。提示词与来源见音乐 manifest；运行游戏不调用腾讯云。
