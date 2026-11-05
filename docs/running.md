# 本地运行、验证与源码交付

## 环境

需要 Node.js／npm、JDK、sbt、Python 3、PostgreSQL 命令行工具（initdb、pg_ctl、psql、createdb）。Scala 与前端依赖版本分别由 build.sbt、package-lock.json 固定。首次联网安装依赖后，可在本地运行；游戏不调用云模型 API。

从项目根运行 `python3 scripts/run.py`。脚本检查 5179／8093 端口，初始化本项目独立数据库（仅在未指定 DATABASE_URL 时），按需 npm ci，校验内容并启动前后端。打开 http://127.0.0.1:5179 。Ctrl-C 仅结束本次脚本启动的进程组，不查找或杀掉其他项目服务；数据库保留运行及数据。后端日志写入 `.local/api.log`。

已有手动启动的实例时，脚本明确拒绝重复启动。可继续使用原来的三个终端命令：

```bash
./scripts/db.sh
# 第二个终端
cd backend && sbt run
# 第三个终端
cd frontend && npm ci && npm run dev
```

PostgreSQL 默认监听 127.0.0.1:55439，项目数据库为 oath 与 oath_test，数据目录为 `.local/postgres`。可通过 OATH_PGPORT 设置本项目端口；脚本不接管其他数据库。需要外部数据库时设置 DATABASE_URL（JDBC URL），按现有 Database 配置提供凭据。勿将配置、令牌或数据库放进提交。

## 构建版演示

`python3 scripts/run.py --built` 先构建前端，再使用 Python 标准库静态服务器与同源 API 代理展示 dist。Scala 仍执行全部身份和存档业务，Python 仅处理静态文件与 HTTP 转发。开发和构建版均只监听本机。

已有 Scala 后端时，可以单独运行：

```bash
npm --prefix frontend run build
python3 scripts/serve.py --port 5180 --api-port 8093
```

`/game` 支持 SPA 页面入口；直接刷新游戏页需要返回标题后读取服务端存档。构建版不依赖 Vite 开发服务器，也不会把源码模块作为游戏资源提供。

## 验证

先准备本地数据库，再执行：

```bash
./scripts/check.sh
# 前后端已运行时增加浏览器验证
./scripts/check.sh --browser
```

check 校验内容引用／可达性、前端格式／单元测试／生产构建、后端真实 PostgreSQL 集成测试及 diff 空白错误。后端测试默认只连接 oath_test；可单独设置 OATH_TEST_DATABASE_URL，不能指向需要保留业务数据的库。浏览器测试需要 Playwright Chromium：首次使用可在 frontend 目录运行 `npx playwright install chromium`。

完整实战的探索性自动操作脚本（增加 `--keyboard` 使用纯键盘预设，以真实方向键操作菜单、J／K 攻击和 Tab 锁定；输出文件额外带 keyboard 后缀）：在 frontend 目录运行 `node playthrough/run.mjs easy` 或 `node playthrough/run.mjs hard`。已有该测试的本地身份时，可加 `--resume` 从服务器继续记录恢复，适用于定位后半段问题；这不算一次从头通关。脚本从新冒险开始，只读取游戏状态作观察，所有推进、移动、攻击与援助都使用浏览器键鼠；不清敌、不加血、不改写状态。它使用预设策略，失败需要区分玩法问题与操作策略问题，不能把脚本失败等同于人类无法通过。

运行结果和阶段截图保存在 `.local/playthrough`；storage 文件含本地匿名令牌，仅用于本机调试，不提交、不分享。这套测试依赖开发服务器的模块观察接口，不对构建版使用。普通浏览器回归测试与完整实战测试分别记录，前者通过不表示完整通关。

## 源码打包

先提交需要交付的源文件，再运行 `./scripts/package.sh`。脚本仅从明确的 Git HEAD 导出 `.local/oath-source-<commit>.tar.gz`；工作区有未提交修改时拒绝打包，防止源码与提交记录不一致。

压缩包包含已跟踪代码、配置、剧本与素材，不含 node_modules、构建输出、本地数据库或令牌。course-skills 位于相邻独立仓库，按课程需要另外提供，不暗中复制或修改其内容。解压后按本文安装依赖、启动即可重建运行资源。
