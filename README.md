# 断链之誓

以 AI 娘为角色的中世纪奇幻冒险游戏，作为前后端课程项目制作。当前正在实现：标题页、Canvas 探索战斗、对白与真实数据库存读档已接入，两难度完整流程已有真实操作通关证据；演出细节与完整交付仍在验收，设置与改键已接入。详见 [实施状态](docs/implementation-status.md)。

## 内容导航

- [验收记录](docs/acceptance.md)：企划 16 项的当前证据与尚未完成项。
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

采用 React＋TypeScript＋Tailwind 前端、Scala 3 后端与 PostgreSQL。启动及测试命令见 [实施状态](docs/implementation-status.md)，当前目录与 API 审查导航见 [架构说明](docs/architecture.md)。

实际页面：`frontend/src/pages/StartPage`（`/`）、`GamePage`（`/game`）。业务请求类位于 `frontend/src/apis/PlayerService` 与 `AdventureService`；公共传输放 `frontend/src/api`。

后端位于 `backend/src/main/scala/services`：`system` 管理基础设施，`PlayerService` 管理匿名身份，`AdventureService` 管理冒险和存档。角色、地图、遭遇与剧情是 `content/` 中的版本化内容，不做无业务必要的独立网络服务。

```bash
./scripts/db.sh
# 终端一
cd backend && sbt run
# 终端二（项目根开始）
cd frontend && npm ci && npm run dev
```

打开 http://127.0.0.1:5179/ 。数据库位于项目 `.local/postgres`，默认端口 55439；后端 8093，仅本机访问。不要将本地匿名身份令牌、数据库或 `.local` 目录打包分享。

## Git 管理

仓库根为 `hw/hw_m`，默认分支为 `main`，统一管理素材、文档和后续代码。初始提交保留整理前的材料，后续修改另行提交，便于查看差异和回退。

在本目录使用 `git status` 查看工作区，使用 `git log --oneline` 查看历史。提交前检查文件范围与 `git diff --cached --check`，按一次明确的内容修改或功能变更创建提交。

`.gitignore` 排除系统文件、依赖、构建产物、本地数据库和常见凭据文件；`.gitattributes` 将图片、PDF 作为二进制素材管理。新命名的真实凭据文件应补充忽略规则。当前仅建立本地仓库，尚未配置远程。
