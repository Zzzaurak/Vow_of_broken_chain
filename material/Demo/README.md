# 课程使用流程视频

目标：提交一段不超过三分钟的使用流程视频，与完整源代码一起控制在 **100,000,000 字节以内**。本次成片约 2 分 38 秒，普通话女声解说、内嵌中文字幕，另保留文案和 SRT。

## 内容与录制方式

八个章节：标题与难度、设置与改键、立绘对白、近战与水球、雨林取宝、手动存档与回档、刷新继续、结束。使用全新的游客身份，通过 Playwright 的真实键鼠输入从开局推进；只读游戏状态辅助选择行走方向和观察结果，不改写角色、敌人、资源、剧情或存档。录制中验证保存响应成功、回档快照一致、刷新后宝物仍在。

固定 Chromium 窗口、浏览器视口与虚拟屏幕均为 1280×720，设备缩放为 1，避免进入全屏后底层录制窗口尺寸变化。字幕另放在下方 80 像素区域，成片 1280×800、24 帧，H.264 视频与 AAC 音频。录制时不要修改前端文件或重建素材，以免 Vite 刷新页面。

视频展示主要使用流程，不是完整通关；没有使用管理员模式或预置后期存档。解说背景音乐来自项目已有音乐，低音量混入，不代替游戏声音测试。

## 文案与配音

- [解说文案](narration.md) 供阅读；[章节配置](narration.json) 是脚本输入。
- 腾讯云 TokenHub：`minimax-speech-2.8-hd`；普通话女声音色 `audiobook_female_1`，语速 1.05。选择依据为 [MiniMax 官方音色目录](https://github.com/MiniMax-AI/skills/blob/main/skills/frontend-dev/references/minimax-voice-catalog.md)，接口依据为[腾讯云同步语音文档](https://cloud.tencent.com/document/product/1823/135796)。
- [配音来源与用量](voice-manifest.json) 记录时长、音频摘要与服务返回的 usage，不据此推算现金余额或费用。
- 按课程 [tencent-tokenhub 技能](../../../course-skills/tencent-tokenhub/SKILL.md) 从本地 JSON 加载密钥。生成脚本只在本地调用服务；游戏运行及提交视频播放均不需要云凭据。

## 复现

从项目根操作，Windows 的 `python3` 换为 `py`。先用 `python3 scripts/run.py` 在一个终端保持游戏运行，确保前端依赖及 Playwright Chromium 已安装。离线后期制作另需 ffmpeg、ffprobe 与 Pillow；Pillow 可通过 `python3 -m pip install Pillow` 安装。

```bash
# 合成配音：需要个人凭据；已生成的章节会复用，不重复调用
python3 scripts/generate-narration.py
# 在另一个终端录制约 158 秒，输出放在忽略的 .local/submission
node frontend/playthrough/record-demo.mjs
# 合成配音、字幕与低音量背景音乐
python3 scripts/render-demo.py
# 提交本次源文件，确认两个源码仓库工作区干净后打包
python3 scripts/package-submission.py
```

后期脚本默认使用 macOS 的 Arial Unicode 字体；其他平台通过 `--font` 传入可显示中文的字体，例如 Windows 的 `C:\Windows\Fonts\msyh.ttc`。录制、合成、打包使用各自默认目录；可用 `--work` 指定合成与打包目录，录制脚本的第一个位置参数指定录像目录。

配音请求前写入 `.pending` 标记，若超时或中断，保留标记并停止，先核实结果再决定后续处理。临时 URL、原始音频和录制中间文件仅在 `.local`，不会进入源码包。

## 交付范围

`断链之誓_课程提交.zip` 包含视频、解说文案、字幕、使用说明、SHA-256 清单，以及 `source/hw_m` 完整代码、锁文件和全部运行素材。相邻的 `source/course-skills` 随包提供课程参考，真实凭据除外。

为控制体积，源码包仅省略 `material/cg/reference.png` 和 `material/background/background-origin.pdf` 两个不参与构建的参考原件；文字转录和所有运行素材均保留。原件仍在本项目 Git 仓库中。Git 历史、依赖、构建产物、本地数据库和身份文件不打包。打包脚本自动检查时长、编码、文件范围、ZIP CRC 及严格的 100MB 上限。
