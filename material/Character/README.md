# 角色素材索引

原立绘按角色迁入 `角色名/portraits/default.png`，保留原始文件内容。场景像素图放入同角色的 `sprites/`；统一人设仍在 [setting.md](setting.md)。角色名使用小写稳定标识，避免后续中文路径与大小写混用。

## 首版角色

| 角色 | 原始立绘 | 四方向像素图 | 当前用途 |
| --- | --- | --- | --- |
| 大肥鱼 DeepSeek | [default.png](deepseek/portraits/default.png) | [idle-directions.png](deepseek/sprites/idle-directions.png) | 主角站立与朝向基础 |
| Claude | [default.png](claude/portraits/default.png) | [idle-directions.png](claude/sprites/idle-directions.png) | 囚室、重逢与终战援助 |
| GPT | [default.png](gpt/portraits/default.png) | [idle-directions.png](gpt/sprites/idle-directions.png) | 北境试炼与终章援助，沿用龙娘形态 |
| GLM | [default.png](glm/portraits/default.png) | [idle-directions.png](glm/sprites/idle-directions.png) | 港镇事件与援助 |
| Qwen | [default.png](qwen/portraits/default.png) | [idle-directions.png](qwen/sprites/idle-directions.png) | 东方道路 NPC |
| Gemini | [default.png](gemini/portraits/default.png) | [idle-directions.png](gemini/sprites/idle-directions.png) | 西方大陆 NPC |

[Kimi](kimi/portraits/default.png) 与 [Grok](grok/portraits/default.png) 的立绘一并迁移保留；两人属于扩展角色，本轮不生成像素图。D 教皇和三类杂兵需要另行确定外观并制作，本目录暂不以现有 AI 娘素材冒充这些角色。

## 四方向图集

每张 `idle-directions.png` 为透明 PNG，按等大的 **2×2** 单元排列：

| 图集位置 | 朝向 | 含义 |
| --- | --- | --- |
| 左上 | `down` | 朝下／正面 |
| 右上 | `up` | 朝上／背面 |
| 左下 | `left` | 朝左侧面 |
| 右下 | `right` | 朝右侧面 |

以上是**四方向站立图，共六张图集、二十四个方向帧**。站立图的实际画布尺寸、单元尺寸、各帧边界与脚底建议定位见 [manifest.json](manifest.json)；新增动作与技能按下面的独立清单加载。原始高分辨率图作为生成母版保留，加载时按明确的矩形取帧，统一角色显示比例与脚底定位，使用最近邻采样，不把母版尺寸当作场景中的角色大小。

简化像素形象保留辨识特征：大肥鱼的蓝发、围裙和鲸尾；Claude 的橙发与向日葵；GPT 的白发、龙角与龙翼；GLM 的黑发、狐耳尾与黑书；Qwen 的蓝紫发和折扇；Gemini 的猫耳尾、异色瞳和四芒星。

## 大肥鱼动作与伙伴技能

本批新增下列图集，布局与站立图的含义不同。可直接打开 [动画预览页](animation-preview.html) 查看播放、切换朝向、暂停与逐帧检查；页面无需构建或联网。实际像素分格、时间、播放顺序和判定触发帧见 [animation-manifest.json](animation-manifest.json)，完整提示词见 [动作生成记录](animation-generation-prompts.md)。

| 角色 | 图集 | 网格与播放方式 |
| --- | --- | --- |
| 大肥鱼 | [walk.png](deepseek/sprites/walk.png) | 3 列×4 行；行依次下、上、左、右，列为站姿／迈步 A／迈步 B，每行按 0→1→0→2 循环 |
| 大肥鱼 | [melee-tail.png](deepseek/sprites/melee-tail.png) | 3 列×4 行；同样四方向，每行预备→摆尾出手→收势，单次播放 |
| 大肥鱼 | [cast-water.png](deepseek/sprites/cast-water.png) | 3 列×4 行；同样四方向，每行蓄力→释放→收势，单次播放 |
| 大肥鱼 | [water.png](deepseek/effects/water.png) | 4 列×2 行；上行四帧水球向右飞行，下行四帧命中水花；弹体按实际瞄准向量旋转 |
| GLM | [cast-forbidden-bind.png](glm/sprites/cast-forbidden-bind.png) | 2×2、四个时间阶段，正面召唤施法 |
| GLM | [forbidden-bind.png](glm/effects/forbidden-bind.png) | 2×2、束缚符文出现→升起→成型→散去；成型阶段可保持 |
| GPT | [cast-starfall.png](gpt/sprites/cast-starfall.png) | 2×2、四个时间阶段，正面召唤施法 |
| GPT | [starfall.png](gpt/effects/starfall.png) | 2×2、星辉预兆→星落→命中→消散 |
| Claude | [cast-sunflower-barrier.png](claude/sprites/cast-sunflower-barrier.png) | 2×2、四个时间阶段，正面召唤施法 |
| Claude | [sunflower-barrier.png](claude/effects/sunflower-barrier.png) | 2×2、金色光环→结界升起→成型→花瓣散去；成型阶段可保持 |

所有 2×2 动作与特效均按**左上→右上→左下→右下**播放，它们是时间阶段，不能按站立图的四方向来读取。伙伴施法者与目标特效是两张独立图片，可在不同场景位置播放。

技能伤害、MP 消耗和 CD 启动由游戏逻辑结算一次；特效重播或保持成型画面不得重复触发。星落命中位置、束缚对象和结界保护范围取决于实际状态，不按图像的外边缘直接充当碰撞体。

本批是带切帧定义的动作／特效母版，尚未接入游戏引擎；实际运行前需统一脚底、帧间比例、攻击时机和结界前后景分层。GLM 事件行走、GPT 试炼专用龙息／落击、主角受伤与倒下等仍在后续清单，见 [企划书](../AI娘冒险游戏_简版企划书.md)。

## 来源与生成记录

原立绘来源为作者补充的 [Bilibili 角色素材原帖](https://www.bilibili.com/opus/1259662694779191301?spm_id_from=333.1007.0.0)，原图作者与许可待补录。GPT 立绘原含柔和背景，本轮保持原始文件，不把它误标为已经完成的纯透明立绘。

像素图使用内置 `image_gen` 工具，依据各角色原始立绘生成；其余五人的生成同时参考大肥鱼像素图以统一画风，未通过程序绘画替代图像生成。提示词、参考关系和检查记录见 [generation-prompts.md](generation-prompts.md)。
