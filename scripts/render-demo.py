#!/usr/bin/env python3
"""Compose genuine browser footage, Mandarin narration, captions and quiet game music."""
import argparse
import json
import math
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def run(command):
    subprocess.run(command, check=True)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)
    ], text=True))


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    hours, minutes = divmod(minutes, 60)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'


def concat_path(path):
    return str(path.resolve()).replace("'", "'\\''")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, default=ROOT / '.local/submission')
    parser.add_argument('--font', type=Path, default=Path('/Library/Fonts/Arial Unicode.ttf'))
    args = parser.parse_args()
    work = args.work.resolve()
    render = work / 'render'
    render.mkdir(parents=True, exist_ok=True)
    plan = json.loads((ROOT / 'material/Demo/narration.json').read_text(encoding='utf-8'))
    timeline = json.loads((work / 'recording/timeline.json').read_text(encoding='utf-8'))
    if timeline['errors'] or len(timeline['events']) != len(plan['chapters']):
        raise SystemExit('Recording incomplete or contains a browser error')
    raw = work / 'recording/raw.webm'
    offset = max(0, float(probe(raw)['format']['duration']) - timeline['elapsed'])
    frame_checks = []
    for event in timeline['events']:
        if event['id'] not in ('story', 'combat', 'exploration', 'resume'):
            continue
        sample = render / (event['id'] + '-capture-check.png')
        run(['ffmpeg', '-y', '-v', 'error', '-ss', str(offset + (event['start'] + event['end']) / 2),
             '-i', str(raw), '-frames:v', '1', str(sample)])
        with Image.open(sample) as frame:
            region = frame.convert('RGB').crop((960, 600, 1280, 720)).resize((32, 12))
            pixels = [region.getpixel((x, y)) for y in range(12) for x in range(32)]
        gray_fraction = sum(all(abs(channel - 128) < 3 for channel in pixel) for pixel in pixels) / len(pixels)
        if gray_fraction > .8:
            raise SystemExit('Fullscreen capture is cropped; set the Chromium window size before recording')
        frame_checks.append(dict(chapter=event['id'], gray_padding_fraction=gray_fraction))
    title_font = ImageFont.truetype(str(args.font), 19)
    text_font = ImageFont.truetype(str(args.font), 25)
    subtitles, segments, chapters = [], [], []
    cursor = 0
    for chapter, event in zip(plan['chapters'], timeline['events'], strict=True):
        if chapter['id'] != event['id']:
            raise SystemExit('Narration and footage chapter order mismatch')
        voice = work / 'narration' / (chapter['id'] + '.mp3')
        voice_duration = float(probe(voice)['format']['duration'])
        duration = math.ceil(max(chapter['min_seconds'], voice_duration + 1.5))
        source_duration = event['end'] - event['start']
        speed = source_duration / duration
        cues = [(0., .5, '')]
        phrases = re.findall(r'[^，。；！？]+[，。；！？]?', chapter['text'])
        phrases = [phrase[i:i + 42] for phrase in phrases for i in range(0, len(phrase), 42)]
        weights = [len(phrase) + 2 for phrase in phrases]
        local = .5
        for phrase, weight in zip(phrases, weights, strict=True):
            end = local + voice_duration * weight / sum(weights)
            cues.append((local, end, phrase))
            subtitles.append((cursor + local, cursor + end, phrase))
            local = end
        cues.append((local, duration, phrases[-1]))
        image_list = render / (chapter['id'] + '.ffconcat')
        lines = ['ffconcat version 1.0']
        for n, (begin, end, text) in enumerate(cues):
            if end <= begin:
                continue
            image = Image.new('RGB', (1280, 80), '#08191f')
            draw = ImageDraw.Draw(image)
            draw.line((0, 0, 1280, 0), fill='#4b747c', width=2)
            draw.text((30, 7), chapter['title'], font=title_font, fill='#dec489')
            draw.text((1250, 7), '断链之誓 / 使用流程', font=title_font, anchor='ra', fill='#94b5b3')
            draw.text((640, 37), text, font=text_font, anchor='ma', fill='#f1f4eb')
            path = render / f"{chapter['id']}-{n:02}.png"
            image.save(path)
            lines += [f"file '{concat_path(path)}'", f'duration {end - begin:.6f}']
        lines += [f"file '{concat_path(path)}'"]
        image_list.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        footer = render / (chapter['id'] + '-footer.mkv')
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(image_list),
             '-vf', 'fps=24', '-t', str(duration), '-c:v', 'ffv1', str(footer)])
        music = ROOT / 'material/Music' / (
            'battle.mp3' if chapter['id'] == 'combat' else
            'reunion.mp3' if chapter['id'] == 'outro' else 'journey.mp3')
        output = render / (chapter['id'] + '.mp4')
        # Only compress excess waiting; retain every recorded action in each chapter.
        video_filter = f'[0:v]setpts=(PTS-STARTPTS)/{speed:.9f},fps=24,scale=1280:720,pad=1280:800:0:0:color=0x08191f[v0];[v0][2:v]overlay=0:720[v];'
        audio_filter = (
            f'[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,adelay=500,apad,atrim=duration={duration}[voice];'
            f'[3:a]atrim=duration={duration},asetpts=PTS-STARTPTS,volume=0.04,'
            f'afade=t=in:d=0.5,afade=t=out:st={duration-.6}:d=0.6[bg];'
            '[voice][bg]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]')
        print(chapter['id'], f'{duration}s, footage {speed:.3f}x', flush=True)
        run(['ffmpeg', '-y', '-v', 'error', '-ss', str(offset + event['start']), '-t', str(source_duration),
             '-i', str(raw), '-i', str(voice), '-i', str(footer), '-stream_loop', '-1', '-i', str(music),
             '-filter_complex', video_filter + audio_filter,
             '-map', '[v]', '-map', '[a]', '-t', str(duration), '-c:v', 'libx264', '-preset', 'slow',
             '-crf', '26', '-maxrate', '550k', '-bufsize', '1100k', '-pix_fmt', 'yuv420p',
             '-c:a', 'aac', '-b:a', '80k', '-ar', '48000', '-ac', '1', '-movflags', '+faststart', str(output)])
        segments.append(output)
        chapters.append(dict(id=chapter['id'], start=cursor, duration=duration, footage_speed=speed))
        cursor += duration
    if cursor > 180:
        raise SystemExit(f'Demo is {cursor}s, exceeding the three-minute requirement')
    list_path = render / 'clips.ffconcat'
    list_path.write_text('\n'.join(f"file '{concat_path(path)}'" for path in segments) + '\n', encoding='utf-8')
    final = work / '断链之誓_使用演示.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(list_path),
         '-c', 'copy', '-movflags', '+faststart', str(final)])
    srt = '\n\n'.join(f'{i}\n{timestamp(begin)} --> {timestamp(end)}\n{text}'
                       for i, (begin, end, text) in enumerate(subtitles, 1)) + '\n'
    (work / '解说字幕.srt').write_text(srt, encoding='utf-8')
    report = dict(duration=float(probe(final)['format']['duration']), bytes=final.stat().st_size,
                  chapters=chapters, resolution='1280x800', fps=24,
                  voice=plan['voice'], browser_errors=timeline['errors'], frame_checks=frame_checks)
    (work / 'video-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Video saved: {report["duration"]:.2f}s, {report["bytes"] / 1e6:.2f} MB', flush=True)


if __name__ == '__main__':
    main()
