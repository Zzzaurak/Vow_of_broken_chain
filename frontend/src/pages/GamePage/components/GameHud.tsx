import { useGame } from '../runtime/store';
import { mapById } from '../objects/content';
import { actionLabel, useSettings } from '../../../features/settings/store';
export function GameHud() {
  const hp = useGame((g) => Math.ceil(g?.snapshot.hp ?? 100)),
    mp = useGame((g) => Math.floor(g?.snapshot.mp ?? 100));
  const mapId = useGame((g) => g?.snapshot.mapId ?? 'steps'),
    mode = useGame((g) => g?.mode.kind),
    stage = useGame((g) => g?.snapshot.stage);
  const water = useGame((g) => Math.ceil(g?.snapshot.cooldowns.water ?? 0));
  const supports = useGame((g) => g?.snapshot.supports);
  const cds = useGame((g) =>
    [g?.snapshot.cooldowns.glm, g?.snapshot.cooldowns.gpt, g?.snapshot.cooldowns.claude]
      .map((x) => Math.ceil(x ?? 0))
      .join(','),
  );
  useSettings();
  const cd = cds.split(',').map(Number);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-[#07161e]/90 to-transparent p-5">
      <div className="w-52">
        <div className="mb-2 flex justify-between text-xs text-[#d9d7c1]">
          <span>大肥鱼</span>
          <span>
            HP {hp} / MP {mp}
          </span>
        </div>
        <div className="h-2 bg-black/50">
          <div className="h-full bg-[#d18d76]" style={{ width: `${hp}%` }} />
        </div>
        <div className="mt-1 h-1.5 bg-black/50">
          <div className="h-full bg-[#79bfcd]" style={{ width: `${mp}%` }} />
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="border border-white/20 bg-black/30 px-2 py-1">
            {actionLabel('water')} 水球 {water || '就绪'}
          </span>
          {supports?.map((p, i) => (
            <span key={p} className="border border-white/20 bg-black/30 px-2 py-1">
              {actionLabel(i === 0 ? 'support1' : 'support2')} {p.toUpperCase()}{' '}
              {cd[['glm', 'gpt', 'claude'].indexOf(p)] || '✓'}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right text-xs">
        <p className="font-serif text-lg text-[#e4d5ae]">{mapById(mapId).name}</p>
        <p className="mt-1 text-[#b7c9c4]">
          {mode === 'battle'
            ? '观察预警 · 完成遭遇'
            : stage === 'cleared'
              ? '沿道路前往下一站'
              : '向前探索 · 寻找线索'}
        </p>
        <p className="mt-2 text-[#91aaa5]">
          {actionLabel('pause')} 暂停 · {actionLabel('interact')} 交互
        </p>
      </div>
    </div>
  );
}
