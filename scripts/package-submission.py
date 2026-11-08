#!/usr/bin/env python3
"""Package the reviewed source and real demo under a strict decimal 100 MB limit."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
# These reference originals are never read by the build or the running game.
REFERENCE_ONLY = {'material/cg/reference.png', 'material/background/background-origin.pdf'}


def tracked(root):
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root):
        raise SystemExit(f'Commit intended changes before packaging: {root.name}')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    return revision, [name for name in names if name]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, default=ROOT / '.local/submission')
    args = parser.parse_args()
    work = args.work.resolve()
    revision, names = tracked(ROOT)
    skills = ROOT.parent / 'course-skills'
    skill_revision, skill_names = tracked(skills)
    video = work / '断链之誓_使用演示.mp4'
    metadata = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(video)
    ], text=True))
    seconds = float(metadata['format']['duration'])
    if not 0 < seconds <= 180:
        raise SystemExit(f'Video duration {seconds}s exceeds the course limit')
    if not any(s['codec_name'] == 'h264' for s in metadata['streams']):
        raise SystemExit('Demo must include a widely playable H.264 video stream')
    if not any(s['codec_name'] == 'aac' for s in metadata['streams']):
        raise SystemExit('Demo must include its AAC narration')
    files = []
    for name in names:
        if name not in REFERENCE_ONLY:
            files.append((ROOT / name, 'source/hw_m/' + name))
    for name in skill_names:
        files.append((skills / name, 'source/course-skills/' + name))
    files += [(video, '断链之誓_使用演示.mp4'),
              (ROOT / 'material/Demo/narration.md', '解说文案.md'),
              (work / '解说字幕.srt', '解说字幕.srt')]
    for path, name in files:
        parts = Path(name).parts
        if any(p in ('.git', '.local', 'node_modules', 'dist', 'target') for p in parts):
            raise SystemExit('Runtime or local data cannot be included: ' + name)
        if path.name.startswith('.env') and path.name != '.env.example':
            raise SystemExit('Local environment file cannot be included: ' + name)
        if path.name == 'Tencent_Cloud.json':
            raise SystemExit('Real cloud credentials cannot be included')
    instructions = f'''# 《断链之誓》课程提交

1. 先观看 `断链之誓_使用演示.mp4`，时长 {seconds:.2f} 秒（不超过三分钟）。包含普通话女声解说与内嵌字幕；`解说文案.md`、`解说字幕.srt` 可单独查阅。
2. 完整源代码、配置、锁文件与全部游戏运行素材在 `source/hw_m/`；课程技能参考在相邻 `source/course-skills/`。安装环境、启动、验证与源码说明见项目 README 和 docs/running.md。
3. 在 `source/hw_m/` 执行 `python3 scripts/run.py`（Windows 使用 `py scripts/run.py`），打开 http://127.0.0.1:5179/ 。依赖为 Node.js/npm、Python、JDK/sbt 和 PostgreSQL 命令行工具。
4. 游戏无需云服务密钥即可运行。首次启动会安装依赖、复制素材并初始化本地数据库；存档由 Scala 后端写入 PostgreSQL。

## 完整性与取舍

源码提交：`{revision}`。课程参考提交：`{skill_revision}`。`文件清单.json` 列出交付文件 SHA-256。

为满足总附件不超过 100MB 的要求，仅省略两个不参与构建的参考原件：`material/cg/reference.png`（制作参考图）和 `material/background/background-origin.pdf`（原始背景参考 PDF）。背景文字转录、剧本、设计文档、角色素材、两张结局 CG、音乐、全部代码与构建所需文件均保留；原件仍保存在原项目 Git 仓库。材料中指向这两个原件的链接在本包内不可用，不影响构建与游戏。

本包不包含 Git 历史、依赖目录、编译产物、数据库、浏览器身份、云凭据或录制中间文件。使用视频展示的是从全新游客冒险开始的真实键鼠操作，未改写游戏状态；它是主要使用流程演示，不是完整通关视频。录制、配音与合成脚本和完整文案在源码 scripts、frontend/playthrough 与 material/Demo 中。
'''
    output = work / '断链之誓_课程提交.zip'
    manifest = dict(source_commit=revision, course_skills_commit=skill_revision,
                    video_seconds=seconds, excluded_reference_originals=sorted(REFERENCE_ONLY), files=[])
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, name in files:
            archive.write(path, name, compress_type=zipfile.ZIP_STORED if path == video else zipfile.ZIP_DEFLATED)
            manifest['files'].append(dict(path=name, bytes=path.stat().st_size,
                                         sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        archive.writestr('使用说明.md', instructions)
        archive.writestr('文件清单.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    if output.stat().st_size > 100_000_000:
        raise SystemExit(f'Package exceeds 100 MB: {output.stat().st_size} bytes; do not submit this file')
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise SystemExit('Archive CRC verification failed')
    report = dict(file=output.name, bytes=output.stat().st_size, decimal_MB=output.stat().st_size / 1e6,
                  video_seconds=seconds, source_commit=revision,
                  sha256=hashlib.sha256(output.read_bytes()).hexdigest(), file_count=len(files) + 2)
    (work / 'package-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
