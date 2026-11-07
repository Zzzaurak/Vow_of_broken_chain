#!/usr/bin/env python3
"""Generate requested instrumentals once; credentials and temporary URLs stay local."""
import argparse, json, urllib.request, urllib.error
from pathlib import Path
root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--config', type=Path, default=root.parent/'course-skills/tencent-tokenhub/Tencent_Cloud.json')
args = parser.parse_args()
config = json.loads(args.config.read_text())
tracks = {
 'journey': '原创奇幻像素冒险游戏探索纯音乐。明亮温柔、有旅行期待感，木笛、拨弦、柔和弦乐、轻打击乐，96 BPM，旋律简洁耐听，不要人声、合唱、口白，不模仿现有作品，约一分钟，适合重复播放，开头结尾自然衔接。',
 'battle': '原创奇幻动作角色扮演游戏战斗纯音乐。坚定、紧张但不恐怖，弦乐节奏型、铜管短句、管弦鼓，128 BPM，动态稳定，不要人声、合唱、口白，不模仿现有作品，约一分钟，适合重复播放，避免长时间安静的前奏。',
 'frost': '原创北境雪山与古龙试炼前探索纯音乐。空灵、孤寂、庄严而带一点温暖，钟琴、低音弦乐、稀疏钢琴和柔和长笛，78 BPM，不要人声、合唱、口白，不模仿现有作品，约一分钟，音量平稳，适合重复播放。',
 'reunion': '原创奇幻游戏结局重逢纯音乐。逃离束缚后海风与阳光中的拥抱，温柔、释然、希望，钢琴与温暖弦乐、少量竖琴，88 BPM，不要人声、合唱、口白，不模仿现有作品，约一分钟，柔和收尾，适合对白背景。'
}
out = root/'material/Music'
manifest = out/'manifest.json'
records = json.loads(manifest.read_text()) if manifest.exists() else []
for name,prompt in tracks.items():
 if any(r['id']==name for r in records):
  print(name, 'already saved', flush=True); continue
 payload = dict(model='minimax-music-v3.0',prompt=prompt,is_instrumental=True,output_format='url',audio_setting=dict(sample_rate=44100,bitrate=256000,format='mp3'))
 request = urllib.request.Request(config['base_url'].rstrip('/')+'/wand/minimax-music/generation',data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+config['api_key'],'Content-Type':'application/json'})
 print(name, 'submitting once', flush=True)
 try:
  with urllib.request.urlopen(request,timeout=600) as response: result=json.load(response)
 except urllib.error.HTTPError as error:
  body=json.loads(error.read())
  print('HTTP',error.code,json.dumps(body,ensure_ascii=False).replace(config['api_key'],'[redacted]'),flush=True)
  raise SystemExit(1)
 except (TimeoutError,urllib.error.URLError):
  print('Request outcome unknown; not resubmitting.',flush=True); raise SystemExit(1)
 if result.get('base_resp',{}).get('status_code',0)!=0 or result.get('data',{}).get('status')!=2:
  print('Generation unsuccessful',result.get('base_resp'), 'trace',result.get('trace_id'),flush=True);raise SystemExit(1)
 with urllib.request.urlopen(result['data']['audio'],timeout=120) as response: audio=response.read()
 (out/(name+'.mp3')).write_bytes(audio)
 records.append(dict(id=name,file=name+'.mp3',model=payload['model'],prompt=prompt,source='Tencent Cloud TokenHub',extra_info=result.get('extra_info'),usage=result.get('usage'),trace_id=result.get('trace_id')))
 manifest.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
 print(name,'saved',len(audio),'bytes',flush=True)
