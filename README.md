# 断链之誓

以 AI 娘为角色的中世纪奇幻冒险游戏，作为前后端课程项目制作。目前处于内容规划阶段，尚无可运行的游戏代码。

## 内容导航

- [简版企划书 v0.5](material/AI娘冒险游戏_简版企划书.md)：按完整版剧本对齐流程、战斗与检查点，明确 HP／MP 100 和两种难度。
- [完整剧情剧本](material/script.md)：当前剧情与对白依据，包含场景、演出和战斗节点；玩法数值按企划执行。
- [角色设定](material/Character/setting.md)：本游戏的人物性格、剧情职责与技能；按角色目录区分立绘和像素素材。
- [角色素材索引](material/Character/README.md)：四方向站立图、主角动作、伙伴技能、立绘路径与素材状态。
- [动作素材预览](material/Character/animation-preview.html)：本地播放十张新增图集，支持朝向切换、暂停和逐帧查看。
- [CG 使用说明](material/cg/README.md)：cg1、cg2 连续结尾演出与制作参考图的区别。
- [背景参考文字](material/background/background-text.md) 与 [原 PDF](material/background/background-origin.pdf)：仅作参考，游戏主线以完整版剧本为准。
- [课程技能](../course-skills/README.md)：相邻独立仓库中的开发规范；不包含在本仓库内，单独克隆本项目后需另行提供。

## 后续实现

拟采用 React＋TypeScript＋Tailwind 前端、Scala 3 后端与 PostgreSQL。拟定页面、服务和 API 对应关系见企划书第 6 节；开发后在本 README 补充实际目录、接口导航、配置和启动步骤。

## Git 管理

仓库根为 `hw/hw_m`，默认分支为 `main`，统一管理素材、文档和后续代码。初始提交保留整理前的材料，后续修改另行提交，便于查看差异和回退。

在本目录使用 `git status` 查看工作区，使用 `git log --oneline` 查看历史。提交前检查文件范围与 `git diff --cached --check`，按一次明确的内容修改或功能变更创建提交。

`.gitignore` 排除系统文件、依赖、构建产物、本地数据库和常见凭据文件；`.gitattributes` 将图片、PDF 作为二进制素材管理。新命名的真实凭据文件应补充忽略规则。当前仅建立本地仓库，尚未配置远程。
