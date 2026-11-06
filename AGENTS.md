# 项目工作约定

此目录是《断链之誓》Git 根。先检查 git status，保留已有用户修改。根据当前用户请求做增量修改，验证后提交相关文件，不自动推送。README.md 记录启动和环境，material/AI娘冒险游戏_简版企划书.md 与 material/script.md 记录剧情。用户最新要求优先于旧企划，相关描述随实现更新。

## 课程约束

阅读 ../course-skills/scala-course-homework/SKILL.md 和 ../course-skills/react-course-frontend/SKILL.md，并按任务读取 references。独立解压缺少技能时说明缺失。Scala 业务数据采用 final case class，同文件伴生对象提供 Circe 编解码器。数据不可变，副作用在 IO 中，连接与事务由 system/database 管理。SQL 封装在 Table；消息 plan(connection) 可以组合其他服务公开表方法。新表配独立 TableInitializer，并接入启动与测试。

React 页面组件、hooks、纯计算就近组织，共享设置、存档和音频在 features。Zustand store 私有，使用明确的订阅、快照和更新函数。样式用 Tailwind，游戏画面用 Canvas。公开消息对应 src/apis/<服务>/XxxMessage 请求类，构造只存 readonly 参数，send 发请求。公共传输在 src/api，路由用稳定消息名。

## 运行与数据

- PlayerService 管理游客、账号、会话和玩家版本，AdventureService 管理冒险、快照、轮换及幂等。两服务统一部署，角色、地图、敌人定义在 content。
- 前端 5179、Scala 8093、项目 PostgreSQL 默认 55439。python3 scripts/run.py 启动，status／stop／restart 管理同一启动器文件锁所代表的实例。旧手动实例需核对 cwd 和 PID。README 列出 Windows 手动路径；原生 Windows 尚未验收。
- oath 为开发库，oath_test 为测试库。不要把持久化测试指向玩家数据，也不要接管其他数据库。
- .local 可能含数据库、令牌、Playwright storageState 和日志。禁止输出或提交凭据。scripts/package.sh 只归档已跟踪文件。
- 新页面要核对 scripts/serve.py 的 SPA 入口，确保生产版刷新可访问。

## 游戏关键路径

- content/world/maps.json 定义地图、障碍、出生点和剧情链。32 像素地块，960×540 逻辑视口；鼠标、摄像机和世界坐标必须使用同一变换。
- GamePage/functions/combat.ts 模拟战斗，progression.ts 管理剧情、遭遇、检查点与切图。runtime/draw.ts、scenery.ts 只绘制，不结算伤害或推进剧情。
- 移动决定行走朝向，攻击保存出手目标。水球从实际发射位置指向选定目标，注意移动前摇导致的落点偏差。GPT 使用 targeting.ts 在角色前方 90°、440 像素内选择最近存活敌人，无目标保留 CD，AOE 在选定位置结算一次。
- 东侧出口围墙开三格口，三个蓝色箭头引导。crossExit 在 explore、完成遭遇且进入口内后推进。港镇出口先渡海，教皇战后由逃离过场进入结局。F 用于开战与休整。
- HP／MP 上限为 100，困难仅将敌态 HP 与伤害翻倍。独立护盾、数量、速度、CD 和援助保持企划参数。
- GLM 按相对 30% 投降；GPT 破盾并受本体伤害即赢；Claude 仅破盾；教皇半血进第二阶段；净化法阵提供五秒反击窗口。
- Control 快进只作用于对白和过场。暂停、失焦与结束剧情时清理输入。帮助键位随两套预设的当前绑定显示。

## 存档兼容

- 安全快照与逐帧状态分开。五手动槽、三自动历史；回档忠实恢复资源和 CD，检查点重试恢复满资源。
- Save／Load 携带 operationId 和 expectedRevision。后端锁玩家并在同事务修改；载入提升版本，旧请求不能覆盖新分支。响应丢失重试同一请求。
- 请求成功前保留现场，覆盖与离开需要确认。原生确认可能异步退出全屏，要等 fullscreenchange 完成再恢复载入后的游戏。
- content/manifest.json 管理版本。修改快照协议或碰撞时核对旧档与 Content.validate，不要因纯绘制改动无条件提升版本。解锁、stage 和 completed 需前后端一致。
- 注册沿用游客 playerId，保留其存档；登录签发新会话，退出撤销当前会话。打开中的游戏保留本标签令牌，避免其他标签登录改变存档归属。

## 验证与素材

按修改范围运行格式、类型、规则测试、真实数据库测试和浏览器专项。scripts/check.sh --browser 要求服务已运行。四方向问题需要结合真实输入、Canvas 实际帧和命中结果检查。

单测在 src/**/__tests__，浏览器用例在 frontend/e2e。frontend/playthrough/run.mjs 只读状态作观察并用真实输入推进。长试玩期间不要修改源码或复制 public/assets，热刷新会清空局内状态。明确区分从新冒险通关与合法检查点夹具验证。

素材原稿在 material，构建按白名单复制到忽略的 frontend/public/assets。图集 manifest 定义 rect、帧序与脚底锚点。方向图和动作帧不能混用，新增素材记录来源或生成提示词。
