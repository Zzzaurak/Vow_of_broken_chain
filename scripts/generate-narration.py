#!/usr/bin/env python3
"""Generate the requested demo voice once per chapter; keep credentials local."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=ROOT.parent / 'course-skills/tencent-tokenhub/Tencent_Cloud.json')
    parser.add_argument('--out', type=Path, default=ROOT / '.local/submission/narration')
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding='utf-8'))
    plan = json.loads((ROOT / 'material/Demo/narration.json').read_text(encoding='utf-8'))
    args.out.mkdir(parents=True, exist_ok=True)
    for chapter in plan['chapters']:
        target = args.out / (chapter['id'] + '.mp3')
        metadata = target.with_suffix('.json')
        fingerprint = hashlib.sha256(json.dumps([chapter['text'], plan['voice']], ensure_ascii=False).encode()).hexdigest()
        if target.exists() and metadata.exists():
            if json.loads(metadata.read_text(encoding='utf-8'))['fingerprint'] != fingerprint:
                raise SystemExit(f"{chapter['id']}: text changed; use a new output directory")
            print(chapter['id'], 'already saved', flush=True)
            continue
        # A pending marker survives interruption: never silently repeat a charged request.
        pending = target.with_suffix('.pending')
        if pending.exists():
            raise SystemExit(f'{pending.name}: previous result unknown; inspect before retrying')
        payload = dict(
            model=plan['voice']['model'], text=chapter['text'],
            voice_setting=dict(voice_id=plan['voice']['voice_id'], speed=plan['voice']['speed'], vol=1, pitch=0),
            audio_setting=dict(sample_rate=32000, bitrate=128000, format='mp3', channel=1),
            subtitle_enable=True, output_format='hex',
        )
        request = urllib.request.Request(
            config['base_url'].rstrip('/') + '/wand/minimax-tts/sync_tts',
            data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
            headers={'Authorization': 'Bearer ' + config['api_key'], 'Content-Type': 'application/json'},
        )
        pending.write_text(fingerprint, encoding='utf-8')
        print(chapter['id'], 'submitting once', flush=True)
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            # Deliberately omit response bodies, which can contain account details.
            raise SystemExit(f'TokenHub HTTP {error.code}; no automatic retry') from None
        except (TimeoutError, urllib.error.URLError):
            raise SystemExit('Request outcome unknown; not resubmitting') from None
        if result.get('base_resp', {}).get('status_code', 0) != 0 or not result.get('data', {}).get('audio'):
            raise SystemExit(f"Synthesis failed: status {result.get('base_resp', {}).get('status_code')}; no automatic retry")
        data = result['data']
        if data['audio'].startswith('https://'):
            with urllib.request.urlopen(data['audio'], timeout=60) as response:
                audio = response.read()
        else:
            audio = bytes.fromhex(data['audio'])
        target.write_bytes(audio)
        subtitles = None
        if data.get('subtitle_file'):
            with urllib.request.urlopen(data['subtitle_file'], timeout=60) as response:
                subtitles = json.load(response)
        duration = float(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(target)
        ], text=True).strip())
        metadata.write_text(json.dumps(dict(
            fingerprint=fingerprint, model=payload['model'], voice_setting=payload['voice_setting'],
            text=chapter['text'], duration=duration, subtitles=subtitles,
            usage=result.get('usage'), extra_info=result.get('extra_info'), trace_id=result.get('trace_id'),
            source='Tencent Cloud TokenHub',
            docs='https://cloud.tencent.com/document/product/1823/135796',
            voice_catalog='https://github.com/MiniMax-AI/skills/blob/main/skills/frontend-dev/references/minimax-voice-catalog.md',
        ), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        pending.unlink()
        print(chapter['id'], f'saved {duration:.2f}s', flush=True)


if __name__ == '__main__':
    main()
