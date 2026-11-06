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
| 音乐与音效 | 项目原创程序合成 | composition.ts 记录四组确定音符；engine.ts 使用 WebAudio 振荡器与包络，不依赖远程音频或第三方曲目 |
| 界面图标 | lucide-react 依赖 | 保留依赖许可证与包信息 |

build-assets.py 按白名单将运行素材复制到 frontend/public/assets，构建前自动执行。原始图片和生成记录保留在 material，不由复制脚本修改。背景漫画、PDF、制作参考图和未使用角色不打包为运行资源。

作者提供素材的权属和公开再分发许可尚未在仓库逐项注明。本项目当前用于本地课程演示；若公开发行，应由作者补充这些原素材的实际来源与许可。生成记录说明制作方式，不替代对原参考素材权属的确认。

对白中的 D 教皇、教会审判长、执事与神秘声音使用原创代码绘制 SVG 剪影，位于 `frontend/src/pages/GamePage/components/DialogueFigure.tsx`。黑金冠冕／权杖区分教皇，兜帽区分教会人物，狐耳暗示神秘声音；与既有伙伴插画并列显示。无需另行下载资源，不替换用户提供的立绘或 CG。

## 探索区域新增绘制

`runtime/regionScenery.ts` 与 `regionPaths.ts` 按内容配置绘制连通道路、瀑布、矿脉、船坞水位、裂谷断层、冰台和书架；`explorationDraw.ts` 绘制机关、宝箱、路牌、营火和吃饭反馈。`villager.ts` 使用原创像素模板与配色区分生活 NPC，`wildlife.ts` 原创绘制树精、野兔、硬壳蛛、发条蟹、晶石巨像、翼蜥、史莱姆和督战官。以上为代码生成的像素画，没有引入下载素材；怪物外观和复用的战斗行为分别维护。
