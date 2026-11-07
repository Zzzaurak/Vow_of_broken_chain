#!/usr/bin/env python3
"""Copy only runtime assets; preserve originals and their pixel/anchor metadata."""
from pathlib import Path
import json
import shutil
ROOT=Path(__file__).resolve().parents[1]
target=ROOT/'frontend/public/assets'
source=ROOT/'material/Character'
manifest=json.loads((source/'manifest.json').read_text())
animations=json.loads((source/'animation-manifest.json').read_text())
paths={c[k] for c in manifest['characters'] for k in ('portrait','sprite')}
paths.update(a['path'] for a in animations['assets'])
for name in sorted(paths):
    dest=target/'characters'/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source/name,dest)
for name in ('cg1.png','cg2.png'):
    dest=target/'cg'/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/'material/cg'/name,dest)
print(f'Copied {len(paths)} character assets and 2 story CGs (no reference or unused characters)')

for folder, name in (("Enemies", "enemies-atlas.png"), ("World", "terrain-atlas.png"), ("World", "travelers-camp.png"), ("World", "exploration-props.png"), ("World", "decor-atlas.png"), ("Enemies", "wildlife-atlas.png")):
    dest=target/folder.lower()/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/"material"/folder/name,dest)
