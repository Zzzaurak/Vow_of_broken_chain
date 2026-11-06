import { distance } from '../functions/geometry';
import { useGame } from '../runtime/store';
import { regionById, mapById } from '../objects/content';
import { exploration, exitAvailable, playerStats } from '../functions/exploration';
import { exitPosition } from '../runtime/explorationDraw';
export function ExplorationHud() {
  const s = useGame((g) => g?.snapshot);
  if (!s) return null;
  const map = mapById(s.mapId),
    region = regionById(s.mapId),
    progress = exploration(s),
    stats = playerStats(s);
  return (
    <div className="mt-3 ml-auto w-48 rounded border border-[#a9c4bb]/30 bg-[#091b24]/85 p-2 text-left">
      <p className="mb-1 text-[10px] text-[#c6d5c6]">区域地图 · 蓝色通路 / 金色调查点</p>
      <svg
        role="img"
        aria-label="当前区域探索地图"
        viewBox={`0 0 ${map.width * 32} ${map.height * 32}`}
        className="h-28 w-full bg-[#233d3c]"
      >
        {map.obstacles.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="#71827b" />
        ))}
        {region.exits.map((e) => {
          const p = exitPosition(map.id, e);
          return (
            <circle
              key={e.id}
              cx={p.x}
              cy={p.y}
              r={24}
              fill={exitAvailable(s, e) ? '#69cfff' : '#827766'}
            >
              <title>{mapById(e.to).name}</title>
            </circle>
          );
        })}
        {region.points
          .filter(
            (p) =>
              p.kind !== 'chest' ||
              progress.collected.includes(p.id) ||
              distance(s.position, { x: p.position[0], y: p.position[1] }) < 260,
          )
          .map((p) => (
            <circle
              key={p.id}
              cx={p.position[0]}
              cy={p.position[1]}
              r={13}
              fill={progress.collected.includes(p.id) ? '#67756c' : '#e1be70'}
            >
              <title>{p.name}</title>
            </circle>
          ))}
        <circle
          cx={s.position.x}
          cy={s.position.y}
          r={22}
          fill="#f6f1d0"
          stroke="#18333b"
          strokeWidth={5}
        />
      </svg>
      <p className="mt-1 text-[10px] text-[#b7c9c4]">
        宝物 {progress.collected.length} · 摆尾 {Math.round(stats.melee)} · 水球{' '}
        {Math.round(stats.water)}
      </p>
    </div>
  );
}
