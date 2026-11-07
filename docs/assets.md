# 素材来源与运行清单

| 内容 | 来源与位置 | 使用方式 |
| --- | --- | --- |
| 剧情与人设 | 作者提供 material/script.md、Character/setting.md | 主线对白按剧本提取，场景节点由构建脚本校验 |
| 原人物立绘 | 作者提供 material/Character/*/portraits | 保留原图；实际加载六名主线角色，预留 Kimi／Grok 不进入首版 |
| 角色像素图与动作 | material/Character 内既有素材 | 分格、动作序列、脚底锚点与生成记录见对应 manifest／generation 文档 |
| 双结尾 CG | 作者提供 material/cg/cg1.png、cg2.png | 顺序展示，不把 reference.png 加入游戏 |
| 普通敌人与教皇图集 | 制作期间通过 image_gen 生成 | material/Enemies/generation.md 记录提示词；manifest.json 记录取帧与透明边界 |
| 环境地块与物件 | 制作期间通过 image_gen 生成 | material/World/generation.md 记录提示词；运行时使用统一 4×4 图集 |
| 地图细节 | 项目原创 Canvas 像素绘制 | scenery.ts 绘制花朵、米饭、灯、纹样；碰撞统一来自 maps.json |
| 背景音乐 | 腾讯云 TokenHub / minimax-music-v3.0 | material/Music 中四首纯音乐；生成提示词、模型与音频元数据见 manifest.json，本地打包播放 |
| 音效与音乐回退 | 项目原创程序合成 | composition.ts 的四组手写音符由 WebAudio 合成；文件音乐尚未就绪时回退，音效继续使用振荡器 |
| 界面图标 | lucide-react 依赖 | 保留依赖许可证与包信息 |

build-assets.py 按白名单将运行素材复制到 frontend/public/assets，构建前自动执行。原始图片和生成记录保留在 material，不由复制脚本修改。背景漫画、PDF、制作参考图和未使用角色不打包为运行资源。

作者提供素材的权属和公开再分发许可尚未在仓库逐项注明。本项目当前用于本地课程演示；若公开发行，应由作者补充这些原素材的实际来源与许可。生成记录说明制作方式，不替代对原参考素材权属的确认。

对白中的 D 教皇、教会审判长、执事与神秘声音使用原创代码绘制 SVG 剪影，位于 `frontend/src/pages/GamePage/components/DialogueFigure.tsx`。黑金冠冕／权杖区分教皇，兜帽区分教会人物，狐耳暗示神秘声音；与既有伙伴插画并列显示。无需另行下载资源，不替换用户提供的立绘或 CG。

## 探索区域新增绘制

`runtime/regionScenery.ts` 与 `regionPaths.ts` 按内容配置绘制连通道路、瀑布、矿脉、船坞水位、裂谷断层、冰台和书架；`explorationDraw.ts` 绘制机关、宝箱、路牌、营火和吃饭反馈。`villager.ts` 使用原创像素模板与配色区分生活 NPC，`wildlife.ts` 原创绘制树精、野兔、硬壳蛛、发条蟹、晶石巨像、翼蜥、史莱姆和督战官。以上为代码生成的像素画，没有引入下载素材；怪物外观和复用的战斗行为分别维护。


## NPC 与篝火精细化

生活 NPC 与篝火现使用 `material/World/travelers-camp.png`，生成记录见同目录 `travelers-camp-generation.md`。每格等比例显示。环境图集物件按底边对齐、正方形比例显示，避免由宽扁碰撞框压缩树木与石柱。地图外沿浅色方块已移除，交互开战提示显示在 HUD。

所有固定休整点显示为篝火。已有篝火的区域使用内容配置中的篝火，其余区域在原恢复位置显示篝火。有配置篝火时，原出生点恢复交互关闭。

## 全场景物件与碰撞修订

宝箱、路牌、木桶、水闸、梯子、荆棘、冰封石、书架、阅读台、祭坛、瀑布、倒木、晾衣架、冰台、花坛、灯具、米饭便当、餐桌、帆船与八种探索野怪已使用精细图集。来源及顺序见 material/World/exploration-generation.md。

静态障碍改为方形物件集合，每个矩形直接同时用于地图贴图、碰撞、寻路和后端保存校验。旧版长条矩形按方形分解，已逐像素核对 23 张地图的占地并集相等，因此旧存档的合法位置仍然有效。荆棘与冰封石按自身 blocker 的位置和大小绘制。交互物件的调查半径与阻挡物占地分别定义。

验证包括 58 项规则测试、17 项真实数据库测试、全 23 地图浏览器截图与边界检查、真实键盘绕树、探索存档、篝火恢复和教学开战。截图使用固定状态定位，完整主线通关记录见先前探索版验收。

新增北境转场素材 `material/World/northern-atlas.png`：内置 image_gen 生成的透明 2×2 图集，雪松、帐篷、图腾、教堂远景按同一等分裁切规则读取。提示词与来源保存在 `material/World/northern-generation.md`。雪松和图腾分别按静态障碍与 blocker 的占地绘制，帐篷及远景仅作环境装饰。

音乐生成通过课程 tencent-tokenhub 技能调用。`scripts/generate-music.py` 从私有 JSON 读取凭据，不把密钥或临时下载地址写入前端。生成一次后按 manifest 跳过已完成曲目。首次 192000 码率被接口明确拒绝，改用官方示例的 256000 后成功生成四首。实际时长由模型决定，不等于提示词中的约一分钟。
