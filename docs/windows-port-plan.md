# Windows 原生运行改造计划

记录 2026-11-08 在 Windows 11（中文区域、非管理员会话）上的环境配置结果，以及原生 Windows 跑通本项目还缺的改造项。README「环境与技术细节」此前标注「原生 Windows 尚未实机验收」，本文件是该工作的入口。

## 一、本机已配好的环境

| 组件 | 版本 | 位置 | 说明 |
| --- | --- | --- | --- |
| JDK | Temurin 21.0.13+9 LTS | `C:\Users\19176\tools\jdk\jdk-21.0.13+9` | Mac 记录为 OpenJDK 27；sbt 1.10.7 + Scala 3.3.5 选 LTS 21 更稳 |
| sbt | 1.10.7 launcher | `C:\Users\19176\tools\sbt` | 与 `backend/project/build.properties` 一致，Scala 版本由 `build.sbt` 固定 |
| PostgreSQL | 18.6 | `C:\Users\19176\tools\pgsql` | 与 Mac 同版本，只取命令行工具 |
| 项目数据库 | 18.6 独立集群 | `<repo>\.local\postgres` | `127.0.0.1:55439`，超级用户 `oath`，trust 认证；库 `oath`、`oath_test` |
| Python | 3.13.0 | `...\Programs\Python\Python313` | 经 `py` 启动器调用 |
| Node.js | 24.14.1 / npm 11.16.0 | nvm4w | Mac 记录 24.19.0 |
| 浏览器测试 | Playwright Chromium | `%LOCALAPPDATA%\ms-playwright` | 已 `npx playwright install chromium` |

用户级环境变量（无需管理员权限）：

    JAVA_HOME  = C:\Users\19176\tools\jdk\jdk-21.0.13+9
    PATH      += %JAVA_HOME%\bin; C:\Users\19176\tools\sbt\bin; C:\Users\19176\tools\pgsql\bin
    PYTHONUTF8 = 1        # 中文区域 Windows 的关键项，见 §3.1-1

安装方式：本次会话没有管理员权限，未做系统级安装、未注册 Windows 服务，全部为用户级便携安装。数据库沿用项目自己的 `.local/postgres`，不启用其他 PostgreSQL 实例，符合「不接管其他数据库」。

数据库没有注册成服务，需手工启停。**启动必须脱离当前控制台**，否则父终端结束或 Ctrl-C 时 `postgres` 会一起退出（本次实测踩到：`postgres` 随启动它的 shell 进程组一起被杀）。端口与监听地址写进 `postgresql.conf`，不再用 `pg_ctl -o` 传参——Windows 上多层引号很容易传坏：

    $data = '<repo>\.local\postgres'; $log = '<repo>\.local\postgres.log'
    # 启动（脱离控制台）
    Start-Process -FilePath 'C:\Users\19176\tools\pgsql\bin\pg_ctl.exe' `
      -ArgumentList @('-D', $data, '-l', $log, 'start') -WindowStyle Hidden
    # 停止 / 探活
    C:\Users\19176\tools\pgsql\bin\pg_ctl.exe -D $data stop -m fast
    C:\Users\19176\tools\pgsql\bin\pg_isready.exe -h 127.0.0.1 -p 55439

## 二、已验证通过

均在原生 Windows 上实际跑出的结果：

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 后端测试 | `sbt test`（`DATABASE_URL=jdbc:postgresql://127.0.0.1:55439/oath_test`） | **19/19 通过** |
| 前端单测 | `npx vitest run` | **68/68 通过** |
| 内容构建 | `py scripts/build-content.py` | 25 地图 / 22 场景 / 153 句对白 |
| 素材构建 | `py scripts/build-assets.py` | 22 角色素材 + 2 CG |
| 类型检查 | `npx tsc --noEmit` | 0 错误 |
| 生产构建 | `npx vite build` | 成功，JS 512 KB |
| 全栈联调 | Vite 5179 → Scala 8093 → PostgreSQL 55439 | 建匿名玩家 / 新冒险 / 列档，`contentVersion` 2.1.0 |
| 浏览器用例 | `npx playwright test` | 29 项全部通过（修正 §4 的夹具后） |

## 三、待补清单

### 3.0 已完成

- `scripts/run.py` 已改为跨平台启动器，`start`／`status`／`stop`／`restart`／`--built` 均在原生 Windows 实测通过，Ctrl-C 与 `stop` 只结束本次启动的进程、数据库保留。
- 新增 `scripts/db.py`，把集群初始化与启停从 Bash 移到 Python；`scripts/db.sh` 改为它的 POSIX 入口，macOS 仍用原命令。
- 新增 `scripts/py.mjs`，npm 的 `predev`／`prebuild` 不再写死 `python3`。
- 启动器与 npm 脚本会为子进程设置 `PYTHONUTF8=1`；脚本内的显式 `encoding` 仍待补（见 3.1-1）。
- `frontend/e2e/trial-retry.spec.ts` 去掉废弃的 `bridge` 标记，e2e 29 项全绿（见 §4）。
- 回归结果：后端 19/19、前端单测 68/68、e2e 29/29。

### 3.1 P0：不改就跑不起来

1. **Python 默认编码是 cp936（中文区域 Windows）** —— 影响面最大的一项。
   `scripts/build-content.py:13`、`scripts/build-assets.py:9` 等处的 `Path.read_text()` 没有指定 `encoding`，Windows 下取 `locale.getpreferredencoding(False)`＝`cp936`，读 `material/script.md`、`manifest.json` 直接抛 `UnicodeDecodeError`。`scripts/build-content.py:10` 的 `write_text()` 同样按 cp936 写出，且 `\n` 被翻译为 `\r\n`——实测 `content/story/dialogue.json` 产生 746 个 CRLF、0 个 LF。
   本机已用 `PYTHONUTF8=1` 绕过，但**不能依赖环境变量**：换机器、CI、或用户直接 `py scripts/xxx.py` 都会重新踩到。
   修法：所有 `read_text` / `write_text` 显式加 `encoding='utf-8'`；写 JSON 时再带 `newline='\n'`，保持与 macOS 逐字节一致。

2. **npm 脚本写死 `python3`（已修复，保留记录）** —— `frontend/package.json:11-12` 的 `predev` / `prebuild` 调用 `python3 ../scripts/build-assets.py`。Windows 上 `python3.exe` 是 Microsoft Store 的别名占位符，执行返回 **exit 9009**；pre 脚本失败会连带中止主脚本，实测 `npm run dev` 与 `npm run build` 都直接失败。现由 `scripts/py.mjs` 探测可用解释器后转发。

3. **`scripts/run.py` 在 Windows 无法导入、也无法启动子进程（已修复，保留记录）**
   - `run.py:4` `import fcntl` → `ModuleNotFoundError`（POSIX 专有），脚本第 4 行即挂。
   - `run.py:68` `signal.SIGHUP` → `AttributeError`；`run.py:106,114` `os.killpg` → `AttributeError`（`SIGTERM` 本身可用）。
   - `run.py:56,59,75,93` 用 `subprocess` 直接起 `npm` / `sbt`：Windows 上它们是 `npm.cmd` / `sbt.bat`，`CreateProcess` 不能直接执行，实测抛 `FileNotFoundError [WinError 2]`（`shutil.which()` 能定位到，但 `Popen(list)` 起不来）。
   - `run.py:76,93` 的 `start_new_session=True` 在 Windows 被接受但**静默忽略**，进程组隔离失效，`stop` 的「只结束本次启动的进程」语义不再成立。
   - `run.py:54` 调用 `scripts/db.sh`（Bash）。
   修法：把 `run.py` 做成跨平台（`msvcrt.locking` 代替 `flock`、`taskkill /T /F` 代替 `killpg`、用 `shutil.which` 解析 `.cmd`/`.bat` 全路径、平台分支跳过 `SIGHUP`），或另加 `scripts/run.ps1`；数据库初始化抽成跨平台函数。

4. **数据库启停只有 Bash 版（已修复，保留记录）** —— `scripts/db.sh` 整份是 Bash，且用到 Windows 上无意义的 `--auth-local`、`-k <unix socket dir>`。现由 `scripts/db.py` 承担：`initdb` 按平台决定是否加 `--auth-local`，端口与监听地址写进 `postgresql.conf`（不再用 `-o` 传参），Windows 上以脱离控制台的方式启动，`db.sh` 只做转发。

5. **行尾与 `.gitattributes`** —— 当前只固定了 `*.md text eol=lf`，而本机 `core.autocrlf=true`，其余文件检出即 CRLF（实测 `frontend/src/main.tsx`、`frontend/package.json`、`scripts/run.py` 全为 CRLF）。后果：
   - `npm run format:check` **全量失败**——Prettier 默认 `endOfLine: "lf"`，实测每个 `.ts` / `.tsx` 都报 `[warn]`，而它是 `check.sh` 的一环；
   - `db.sh` / `check.sh` / `package.sh` 带 CRLF 后，在 WSL 或 Git Bash 下报 `bad interpreter`；
   - `build-content.py` 产出的 JSON 也变成 CRLF（同 §3.1-1）。
   修法：`.gitattributes` 增加 `* text=auto eol=lf`（二进制素材的 `binary` 声明保留），或在仓库层显式关闭 autocrlf；两种都配合 `git add --renormalize .`。

### 3.2 P1：校验脚本与文档

6. **`scripts/check.sh` / `scripts/package.sh` 需要 PowerShell 版**。`check.sh` 的六步（内容校验、格式、前端单测、生产构建、`oath_test` 集成测试、`git diff --check`）逐条对应即可；`package.sh` 需要「工作区干净」检查加 `git archive`，本机 `tar.exe` 为 bsdtar 3.8.9，可直接产出 `.tar.gz`。

7. **文档更新（已更新）**：`README.md` 的「Windows 移植入口」与 `docs/running.md` 已按实测改写——共用同一启动器、Windows 用 `py` 命令名、`PYTHONUTF8`、数据库启停方式，以及 `lsof` / `kill -TERM` 的 Windows 对应做法。原先记录的「`npm run dev` 在 Windows 不可用」已由 `scripts/py.mjs` 修掉，不再需要直连 Vite。

8. **浏览器用例依赖 PATH 上的 `psql`**：`frontend/e2e/administrator.spec.ts:18` 用 `execFileSync('psql', ['-h','127.0.0.1','-p','55439','-U','oath','-d','oath', …])` 把测试账号提权。跑 e2e 的终端必须有 `psql` 在 PATH（本机已加入用户 PATH）。不写明时表现为 `spawnSync psql ENOENT`。

9. **同一个项目目录不能同时跑 `sbt run` 和 `sbt test`**：后端实例在跑时执行 `sbt test`，实测报
   `ServerAlreadyBootingException: Could not create lock for \\.\pipe\sbt-load…_lock, error 5`
   —— sbt 的 boot server 在 Windows 上走命名管道，被在跑的实例占住。停掉在跑的实例后，`sbt test` 正常（19/19）。这会影响「后端已运行时执行 check」的验证流程，Windows 侧脚本应在跑 `sbt test` 前先停掉游戏后端（或为测试用独立的 sbt boot 目录）。

### 3.3 P2：已知但暂不阻断

10. npm 11.16 默认拦截安装脚本（`allow-scripts`），`esbuild@0.25.12` 的 postinstall 被跳过。实测 `node_modules/@esbuild/win32-x64/esbuild.exe` 已在、`npx esbuild --version` 正常、`vite build` 通过，暂不影响；建议在文档写清或用 npm 配置显式放行，避免换机时误判。
11. `scripts/provision-admin.py:20` 的 `os.chmod(file, 0o600)` 在 Windows 上不等价于 POSIX 权限（NTFS ACL），不阻断；确需限制应改用 ACL。
12. 版本对照：Mac 记录 OpenJDK 27 / Node 24.19.0，本机 JDK 21 / Node 24.14.1。README 环境表建议拆成「macOS / Windows」两列。

## 四、与平台无关的既存缺陷（已修复）

`frontend/e2e/trial-retry.spec.ts:44` 曾 seed `flags: ['qwen', 'sluice', 'bridge']`，但 HEAD 提交 `905d322`（「封闭船坞与冰殿宝箱路线…」）已从 `content/world/exploration.json` 移除 `"id": "bridge"` 这个点；`bridge` 现在只是若干点的 `kind`（外观）取值。后端 `Content.scala:81` 用点 id 推导 `knownFlags`，`:96` 要求 `flags ⊆ knownFlags`，于是该存档被判定 `invalid_snapshot`（「存档内容、资源或剧情阶段不一致，未覆盖已有记录。」）。

该 spec 最后修改于 `c87b98d`，早于上述内容变更，因此**在 macOS 上同样会失败**，与 Windows 无关。

现已把 seed 改为 `flags: ['qwen', 'sluice']`，e2e 29 项全部通过。注意要区分两类 `bridge`：作为**点 id** 的旧标记已经废弃（`Content.scala:29` 的 2.0.0 升级过滤仍须保留，用于清理旧存档），而作为 **`kind`** 的取值仍被船坞梯子与冰殿升降冰块等 4 个可交互点使用，不能一并删除。

## 五、实施顺序与验收

1. ~~P0-2、P0-3、P0-4（启动器与数据库跨平台）~~ **已完成**：`run.py`／`db.py`／`py.mjs`，四个动作与 `--built` 均在原生 Windows 实测通过。
2. ~~修 §4 的夹具~~ **已完成**，e2e 29/29。
3. **待做** P0-1、P0-5（脚本内显式编码 + 行尾）：它们会让其他所有校验结果失真。
4. **待做** P1-6（check／package 的 Windows 入口）与 P1-7 的剩余部分。
5. **待做** P2 收尾。

验收（每条都要在本机跑出结果）：

    py scripts/build-content.py
    npm --prefix frontend run format:check
    npm --prefix frontend test
    npm --prefix frontend run build
    # 测试终端将 DATABASE_URL 指向 oath_test
    sbt test
    # 前后端已运行时
    npm --prefix frontend run test:e2e
    py scripts/run.py start / status / stop / restart

最后一条是 Windows 的验收标志：`run.py` 四个动作都要能用，且 `stop` 只结束本次启动的进程，不动数据库与其他实例。
