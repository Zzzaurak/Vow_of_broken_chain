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
            text = line.strip()
            if text.startswith('“') and text.endswith('”'):
                lines.append({'speaker': speaker, 'text': text[1:-1]})
        scenes.append({'id': scene_id, 'title': title, 'lines': lines})
    assert len(scenes) == 16, f'Unexpected authored scene count: {len(scenes)}'
    assert all(scene['lines'] for scene in scenes)
    # Battle calls reuse authored lines, rather than inventing conflicting dialogue.
    garden = next(scene for scene in scenes if scene['id'] == '5-2')
    calls = [line for line in garden['lines'] if line['speaker'] == '大肥鱼']
    scenes.extend([
        {'id': '5-B-call-1', 'title': '向日葵下的真心', 'lines': [calls[2]]},
        {'id': '5-B-call-2', 'title': '向日葵下的真心', 'lines': [calls[-1]]},
    ])
    write(ROOT / 'content/story/dialogue.json', scenes)
    maps = json.loads((ROOT / 'content/world/maps.json').read_text())
    ids = {m['id'] for m in maps}
    assert len(ids) == len(maps) == 12
    for m in maps:
        assert isinstance(m.get('chapter'), str) and m['chapter'].strip(), f"Missing chapter: {m['id']}"
        assert m['width'] > 0 and m['height'] > 0
        x,y = m['spawn']
        assert 0 < x < m['width'] * 32 and 0 < y < m['height'] * 32
        for obstacle in m['obstacles']:
            ox,oy,w,h = obstacle
            assert not (ox <= x <= ox+w and oy <= y <= oy+h), m['id']
        assert m['next'] is None or m['next'] in ids
    encounters=json.loads((ROOT/'content/encounters/encounters.json').read_text())
    enemy_ids=set(json.loads((ROOT/'content/balance/combat.json').read_text())['enemies'])
    encounter_ids={e['id'] for e in encounters}
    scene_ids={scene['id'] for scene in scenes}
    assert len(encounter_ids)==len(encounters)
    assert all(e['waves'] and all(wave and set(wave)<=enemy_ids for wave in e['waves']) for e in encounters)
    for index,m in enumerate(maps):
        assert m['next']==(maps[index+1]['id'] if index+1<len(maps) else None)
        assert m['encounter'] is None or m['encounter'] in encounter_ids
        assert all(m[key] is None or m[key] in scene_ids for key in ('before','after'))
        assert m['unlock'] in (None,'glm','gpt','claude')
        assert m['checkpoint']==m['id'] and m['objective']
        x,y=m['exit']
        assert 24<=x<=m['width']*32-24 and 24<=y<=m['height']*32-24
        assert not any(ox-12<=x<=ox+w+12 and oy-8<=y<=oy+h+8 for ox,oy,w,h in m['obstacles'])
        # Verify a walkable route through the collision grid, including feet clearance.
        def valid(cell):
            cx,cy=cell;px,py=cx*32+16,cy*32+16
            return 24<=px<=m['width']*32-24 and 24<=py<=m['height']*32-24 and not any(ox-12<=px<=ox+w+12 and oy-8<=py<=oy+h+8 for ox,oy,w,h in m['obstacles'])
        start=tuple(int(v//32) for v in m['spawn']);goal=tuple(int(v//32) for v in m['exit'])
        pending=[start];seen={start}
        for cell in pending:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                other=(cell[0]+dx,cell[1]+dy)
                if other not in seen and valid(other):seen.add(other);pending.append(other)
        assert goal in seen, f"Unreachable exit: {m['id']}"
        if m['encounter']:
            encounter=next(e for e in encounters if e['id']==m['encounter'])
            for wave in encounter['waves']:
                for i,_ in enumerate(wave):
                    px=m['width']*32*.55+(i%3)*100
                    py=m['height']*16+(i//3*2-1)*90
                    assert 24<=px<=m['width']*32-24 and 24<=py<=m['height']*32-24
                    assert not any(ox-12<=px<=ox+w+12 and oy-8<=py<=oy+h+8 for ox,oy,w,h in m['obstacles']), f"Blocked enemy spawn: {m['id']} #{i}"
                    assert (int(px//32),int(py//32)) in seen, f"Unreachable enemy spawn: {m['id']} #{i}"

    assert sum(m['finalPreparation'] for m in maps)==1
    print(f'Validated {len(maps)} maps, {len(scenes)} scenes, {sum(len(s["lines"]) for s in scenes)} dialogue lines')

if __name__ == '__main__':
    main()
