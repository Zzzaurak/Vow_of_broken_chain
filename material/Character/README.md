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

这些是**四方向站立图，共六张图集、二十四个方向帧**，不是完整行走动画。原始高分辨率图作为生成母版保留，实际画布尺寸、单元尺寸、各帧边界与脚底建议定位见 [manifest.json](manifest.json)。加载时按明确的矩形取帧，按统一的世界显示高度对齐脚底，使用最近邻采样；不要直接把高分辨率画布尺寸当作场景角色大小。

简化像素形象保留辨识特征：大肥鱼的蓝发、围裙和鲸尾；Claude 的橙发与向日葵；GPT 的白发、龙角与龙翼；GLM 的黑发、狐耳尾与黑书；Qwen 的蓝紫发和折扇；Gemini 的猫耳尾、异色瞳和四芒星。

主角后续需补四方向行走、摆尾和施法动作；GLM 补事件移动；支援角色补短动作与独立技能特效。完整范围见 [企划书](../AI娘冒险游戏_简版企划书.md)。

## 来源与生成记录

原立绘来源为作者补充的 [Bilibili 角色素材原帖](https://www.bilibili.com/opus/1259662694779191301?spm_id_from=333.1007.0.0)，原图作者与许可待补录。GPT 立绘原含柔和背景，本轮保持原始文件，不把它误标为已经完成的纯透明立绘。

像素图使用内置 `image_gen` 工具，依据各角色原始立绘生成；其余五人的生成同时参考大肥鱼像素图以统一画风，未通过程序绘画替代图像生成。提示词、参考关系和检查记录见 [generation-prompts.md](generation-prompts.md)。
