#!/usr/bin/env python3
"""Build runtime dialogue from the authored script; validate the shared world catalog."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def main():
    script = (ROOT / 'material/script.md').read_text()
    scenes = []
    for match in re.finditer(r'^### 场景 ([0-9]+-[0-9]+)：([^\n]+)\n(.*?)(?=^### |^## |\Z)', script, re.M | re.S):
        scene_id, title, body = match.groups()
        speaker = '旁白'
        lines = []
        for line in body.splitlines():
            who = re.match(r'^\*\*([^*]+)\*\*：', line)
            if who:
                speaker = who.group(1)
            for quote in re.findall(r'“([^”]+)”', line):
                if line.lstrip().startswith('“'):
                    lines.append({'speaker': speaker, 'text': quote})
        scenes.append({'id': scene_id, 'title': title, 'lines': lines})
    assert len(scenes) == 16, f'Unexpected authored scene count: {len(scenes)}'
    assert all(scene['lines'] for scene in scenes)
    write(ROOT / 'content/story/dialogue.json', scenes)
    maps = json.loads((ROOT / 'content/world/maps.json').read_text())
    ids = {m['id'] for m in maps}
    assert len(ids) == len(maps) == 12
    for m in maps:
        assert m['width'] > 0 and m['height'] > 0
        x,y = m['spawn']
        assert 0 < x < m['width'] * 32 and 0 < y < m['height'] * 32
        for obstacle in m['obstacles']:
            ox,oy,w,h = obstacle
            assert not (ox <= x <= ox+w and oy <= y <= oy+h), m['id']
        assert m['next'] is None or m['next'] in ids
    print(f'Validated {len(maps)} maps, {len(scenes)} scenes, {sum(len(s["lines"]) for s in scenes)} dialogue lines')

if __name__ == '__main__':
    main()
