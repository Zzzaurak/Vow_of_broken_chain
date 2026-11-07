# 断链之誓 · 生成音乐

通过课程腾讯云 TokenHub 的 `minimax-music-v3.0` 生成。全部请求 `is_instrumental=true`，MP3 / 44100 Hz / 256 kbps。完整提示词和返回元数据在 manifest.json。

| 文件 | 场景 | 时长 |
| --- | --- | --- |
| journey.mp3 | 探索 | 2:43 |
| battle.mp3 | 战斗 | 1:36 |
| frost.mp3 | 北境 | 6:52 |
| reunion.mp3 | 重逢 | 3:05 |

四首均通过完整解码检查及浏览器播放验证。模型生成长度由服务决定。音频直接本地打包；临时下载链接和密钥未进入仓库。旧 BGM 为 composition.ts 中手写旋律，经 WebAudio 合成，现作为加载失败回退。
