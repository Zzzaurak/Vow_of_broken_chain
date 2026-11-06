import maps from '../../../../content/world/maps.json';
import type { SaveRecord } from '../../apis/AdventureService/types';

export function summarizeSave(save: SaveRecord) {
  const snapshot = save.snapshot;
  const map = maps.find((entry) => entry.id === snapshot.mapId);
  const seconds = Math.max(0, Math.floor(snapshot.playSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const duration = `${hours > 0 ? `${hours} 小时 ` : ''}${minutes} 分 ${seconds % 60} 秒`;
  const difficulty = snapshot.difficulty === 'easy' ? '简单' : '困难';
  const kind = save.kind === 'auto' ? '自动' : `手动 ${save.slot}`;
  const objective =
    snapshot.stage === 'finished'
      ? '已通关 · 重温旅途的终点'
      : snapshot.stage === 'ending'
        ? '与伙伴共度尾声'
        : snapshot.stage === 'cleared'
          ? `区域已清理 · 可回访探索 · 宝物 ${snapshot.exploration?.collected.length ?? 0}`
          : (map?.objective ?? '此记录来自其他内容版本，读取时将检查兼容性。');
  return {
    title: `${kind} · ${map?.name ?? '未知地点'} · ${difficulty}`,
    chapter: map?.chapter ?? '未知章节',
    objective,
    duration,
    savedAt: new Date(save.savedAt).toLocaleString('zh-CN', { hour12: false }),
    resources: `HP ${Math.ceil(snapshot.hp)} / MP ${Math.floor(snapshot.mp)}`,
  };
}
