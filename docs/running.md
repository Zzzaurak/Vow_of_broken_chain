# 本地运行、验证与源码交付

## 环境

需要 Node.js／npm、JDK、sbt、Python 3、PostgreSQL 命令行工具（initdb、pg_ctl、pg_isready、psql、createdb）。Scala 与前端依赖版本分别由 build.sbt、package-lock.json 固定。首次联网安装依赖后，可在本地运行；游戏不调用云模型 API。

## 启动与停止

在项目根目录运行。下文的 `python3` 在 Windows 上替换为 `py`。

| 操作 | macOS / Linux | Windows |
| --- | --- | --- |
| 启动开发版 | `python3 scripts/run.py` | `py scripts/run.py` |
| 启动构建版 | `python3 scripts/run.py --built` | `py scripts/run.py --built` |
| 仅启动数据库 | `python3 scripts/db.py` | `py scripts/db.py` |

启动器检查 5179／8093 端口，准备独立数据库（未指定 DATABASE_URL 时）、按需执行 npm ci、校验内容并启动前后端。打开 http://127.0.0.1:5179 。后端日志在 `.local/api.log`。

在另一个终端运行 `python3 scripts/run.py status` 查看实例、`stop` 关闭、`restart` 重启；重启为构建版使用 `restart --built`。重复启动只显示已有实例地址。Ctrl-C 和 `stop` 关闭本次启动的前后端，保留数据库与存档。手动启动的服务在各自原终端关闭。

PostgreSQL 默认监听 127.0.0.1:55439，开发库为 oath，测试库为 oath_test，数据目录为 `.local/postgres`。`python3 scripts/db.py status` 查看数据库、`stop` 单独关闭数据库；macOS / Linux 也可用 `scripts/db.sh`。OATH_PGPORT 可调整端口。外部数据库使用 DATABASE_URL（JDBC URL）及 PGUSER、PGPASSWORD 配置。

修改 OATH_PGPORT 前，先停止游戏并执行 `python3 scripts/db.py stop`，再设置新端口并启动。启动脚本会核对实际运行端口与数据目录；旧实例仍在运行或目标端口属于其他 PostgreSQL 时拒绝建库。Windows 使用 Job Object 管理本次启动的进程树，父进程异常退出后仍会清理其子进程。

启动器与 npm 构建会启用 Python UTF-8 模式。Windows 手动执行其他 Python 脚本时使用 `py -X utf8 scripts/脚本名.py`。

## 构建版演示

`--built` 先构建前端，再使用 Python 标准库静态服务器与同源 API 代理展示 dist。Scala 仍执行全部身份和存档业务，Python 仅处理静态文件与 HTTP 转发。开发和构建版均只监听本机。

已有 Scala 后端时，可以单独运行：

```bash
npm --prefix frontend run build
python3 scripts/serve.py --port 5180 --api-port 8093
```

`/account`、`/game` 支持 SPA 页面入口；直接刷新游戏页需要返回标题后读取服务端存档。

## 验证

启动脚本的回归测试：`python3 -m unittest discover -s scripts/tests -v`。进程树回归覆盖 macOS／Linux 进程组和 Windows Job Object，验证父包装进程退出后仍能关闭后代并释放端口；设置环境变量 `OATH_SCRIPT_DB_TESTS=1` 后，还会在临时目录创建、启动并清理两个独立 PostgreSQL 集群，验证改端口时不会误操作另一实例，需 PostgreSQL 工具在 PATH 中。此测试不连接项目玩家数据库。

macOS / Linux 先启动本地数据库，再执行：

```bash
bash scripts/check.sh
# 前后端已运行时增加浏览器验证
bash scripts/check.sh --browser
```

check 校验内容引用／可达性、前端格式／单元测试／生产构建、后端真实 PostgreSQL 集成测试及 diff 空白错误。后端测试默认只连接 oath_test；可单独设置 OATH_TEST_DATABASE_URL，不能指向需要保留业务数据的库。浏览器测试需要 Playwright Chromium：首次使用可在 frontend 目录运行 `npx playwright install chromium`。

Windows 在单独的 PowerShell 测试终端执行以下步骤；先停止游戏，避免同目录的 `sbt run` 与 `sbt test` 争用启动锁：

```powershell
py scripts/run.py stop
py scripts/db.py
py -X utf8 scripts/build-content.py
npm --prefix frontend run format:check
npm --prefix frontend test
npm --prefix frontend run build
$env:DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55439/oath_test'
Push-Location backend
sbt test
Pop-Location
git diff --check
```

使用自定义数据库端口时同步调整测试 URL。完成后关闭测试终端，在其他终端正常启动游戏，再运行 `npm --prefix frontend run test:e2e`。

完整实战的探索性自动操作脚本（增加 `--keyboard` 使用纯键盘预设，以真实方向键操作菜单、J／K 攻击和 Tab 锁定；输出文件额外带 keyboard 后缀）：在 frontend 目录运行 `node playthrough/run.mjs easy` 或 `node playthrough/run.mjs hard`。已有该测试的本地身份时，可加 `--resume` 从服务器继续记录恢复，适用于定位后半段问题；这不算一次从头通关。脚本从新冒险开始，只读取游戏状态作观察，所有推进、移动、攻击与援助都使用浏览器键鼠；不清敌、不加血、不改写状态。它使用预设策略，失败需要区分玩法问题与操作策略问题，不能把脚本失败等同于人类无法通过。

运行结果和阶段截图保存在 `.local/playthrough`；storage 文件含本地匿名令牌，仅用于本机调试，不提交、不分享。这套测试依赖开发服务器的模块观察接口，不对构建版使用。普通浏览器回归测试与完整实战测试分别记录，前者通过不表示完整通关。

## 源码打包

先提交需要交付的源文件，再运行 `bash scripts/package.sh`（Windows 可使用 Git Bash）。脚本仅从明确的 Git HEAD 导出 `.local/oath-source-<commit>.tar.gz`；工作区有未提交修改时拒绝打包，防止源码与提交记录不一致。

压缩包包含已跟踪代码、配置、剧本与素材，不含 node_modules、构建输出、本地数据库或令牌。course-skills 位于相邻独立仓库，按课程需要另外提供，不暗中复制或修改其内容。解压后按本文安装依赖、启动即可重建运行资源。
