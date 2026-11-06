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

## 环境与技术细节

下表记录当前开发机环境，依赖以锁文件为准。原生 Windows 尚未实机验收。

| 部分 | 当前环境／固定配置 |
| --- | --- |
| 系统 | macOS，zsh；启动器使用 POSIX 进程组和文件锁 |
| Node.js | 24.19.0；npm 使用 frontend/package-lock.json |
| 前端 | React 19.3.1、TypeScript 5.7.3、Vite 6.4.5、Tailwind 4.3.3、Zustand 5.0.16 |
| JVM | 本机 OpenJDK 27；Scala 3.3.5、sbt 1.10.7 由 backend 配置固定 |
| 后端 | Cats Effect 3.6.3、http4s 0.23.30、Circe 0.14.10、PostgreSQL JDBC 42.7.5 |
| Python | 本机 3.13.15；运行和内容构建脚本使用标准库 |
| 数据库 | 本机 PostgreSQL 18.6；开发库 oath，测试库 oath_test |
| 浏览器检查 | Playwright Chromium；在 frontend 执行 npx playwright install chromium 安装测试浏览器 |

前端监听 127.0.0.1:5179，将 /api 代理到 Scala 的 127.0.0.1:8093。Canvas 使用 960×540 逻辑坐标并等比缩放，输入转换回世界坐标。地图地块为 32 像素，物理模拟为固定 60Hz。对白与暂停冻结战斗计时。

数据库连接由 DATABASE_URL、PGUSER、PGPASSWORD 指定，URL 为 JDBC 格式，例如 jdbc:postgresql://127.0.0.1:55439/oath。未设置连接时，启动器初始化项目独立的 .local/postgres，仅监听本机，开发用户为 oath。OATH_PGPORT 可调整该数据库的端口。Scala 的 PORT 可调整 HTTP 端口，但启动器和 Vite 代理约定 8093，变更时需一并修改调用侧。

素材原稿在 material，场景、敌人、剧情与数值在 content。build-assets.py 将白名单素材复制至 frontend/public/assets；build-content.py 从剧本提取对白并校验内容引用和地图可达性。npm dev/build 自动复制素材。Scala 构建把同一份 content 打入资源目录，内容变更后需要重启后端。数据库表在后端启动时初始化。

GPT 援助按大肥鱼当前朝向，在前方 90°、440 像素范围内选择最近存活敌人，在选定位置造成范围伤害。无目标时提示并保留 CD。清场后沿三个蓝色箭头走入三格围墙缺口，会自动前往下一站。

## Windows 移植入口

可以先在 WSL 安装上述工具并沿用项目脚本。原生 Windows 应分别启动数据库、Scala 和前端。当前 run.py 使用 fcntl、os.killpg 和 POSIX 信号，db.sh、check.sh、package.sh 使用 Bash，直接在 PowerShell 运行需要适配。

安装 PostgreSQL 后，创建 oath 用户和由它拥有的 oath、oath_test 两个数据库。不同 PowerShell 终端可以分别运行以下命令。将端口与密码替换为自己的数据库配置。

    # 项目根目录
    py scripts/build-content.py
    py scripts/build-assets.py

    # 后端终端，从项目根开始
    $env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:5432/oath"
    $env:PGUSER = "oath"
    $env:PGPASSWORD = "<本机数据库密码>"
    cd backend
    sbt run

    # 前端终端，从项目根开始
    cd frontend
    npm ci
    npx vite --host 127.0.0.1 --port 5179 --strictPort

先用 py 生成素材，再直接调用 Vite，可处理 Windows 上 Python 命令仅为 py 的情况。若 python3 可用，也可使用现有 npm scripts。各终端用 Ctrl-C 结束，数据库通过 PostgreSQL 服务管理。

生产构建可在素材生成后分别执行以下命令，Scala 后端应保持运行。

    cd frontend
    npx tsc --noEmit
    npx vite build
    cd ..
    py scripts/serve.py --port 5179 --api-port 8093

迁移存档使用 PostgreSQL 的 pg_dump／pg_restore，保留玩家与账号数据。每个测试终端明确连接独立 oath_test。密码使用随机盐与 PBKDF2 校验值，数据库中的会话令牌保存摘要。浏览器保存当前会话令牌；.local、数据库目录和含凭据配置均应留在 Git 之外。

## 修改后的验证

    python3 scripts/build-content.py
    npm --prefix frontend run format:check
    npm --prefix frontend test
    npm --prefix frontend run build
    # 已启动本项目前后端与数据库时
    ./scripts/check.sh --browser

Windows 可分别执行相应 npm 命令，在后端测试终端将 DATABASE_URL 设置为 oath_test 的 JDBC URL 后执行 sbt test。完整试玩脚本在 frontend 内运行 node playthrough/run.mjs easy --keyboard 或 node playthrough/run.mjs hard，结果保存到忽略的 .local/playthrough。Agent 接手说明见 [AGENTS.md](AGENTS.md)。
