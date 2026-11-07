import { playerStats, explorationObjective } from '../functions/exploration';
import { ExplorationHud } from './ExplorationHud';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../runtime/store';
import { mapById, regionById } from '../objects/content';
import { actionLabel, useSettings } from '../../../features/settings/store';
export function GameHud() {
  const hp = useGame((g) => Math.ceil(g?.snapshot.hp ?? 100)),
    mp = useGame((g) => Math.floor(g?.snapshot.mp ?? 100));
  const mapId = useGame((g) => g?.snapshot.mapId ?? 'steps'),
    mode = useGame((g) => g?.mode.kind),
    stage = useGame((g) => g?.snapshot.stage);
  const water = useGame((g) => Math.ceil(g?.snapshot.cooldowns.water ?? 0));
  const supports = useGame((g) => g?.snapshot.supports);
  const cds = useGame(
    useShallow((g) => ({
      glm: Math.ceil(g?.snapshot.cooldowns.glm ?? 0),
      gpt: Math.ceil(g?.snapshot.cooldowns.gpt ?? 0),
      claude: Math.ceil(g?.snapshot.cooldowns.claude ?? 0),
    })),
  );
  const stats = useGame(
    useShallow((g) =>
      g
        ? playerStats(g.snapshot)
        : { maxHp: 100, maxMp: 100, regen: 2, melee: 18, water: 32, radius: 90 },
    ),
  );
  const objective = useGame((g) => (g ? explorationObjective(g.snapshot) : ''));
  const canStartBattle = useGame((g) => {
    if (!g || g.mode.kind !== 'explore') return false;
    const map = mapById(g.snapshot.mapId),
      region = regionById(map.id);
    return (
      !!map.encounter &&
      !g.snapshot.completed.includes(map.encounter) &&
      !region.autoBattle &&
      Math.hypot(
        g.snapshot.position.x - region.trigger[0],
        g.snapshot.position.y - region.trigger[1],
      ) < 350
    );
  });
  useSettings();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-[#07161e]/90 to-transparent p-5">
      <div className="w-52">
        <div className="mb-2 flex justify-between text-xs text-[#d9d7c1]">
          <span>大肥鱼</span>
          <span>
            HP {hp}/{stats.maxHp} · MP {mp}/{stats.maxMp}
          </span>
        </div>
        <div className="h-2 bg-black/50">
          <div className="h-full bg-[#d18d76]" style={{ width: `${(hp / stats.maxHp) * 100}%` }} />
        </div>
        <div className="mt-1 h-1.5 bg-black/50">
          <div className="h-full bg-[#79bfcd]" style={{ width: `${(mp / stats.maxMp) * 100}%` }} />
        </div>
        <div className="mt-3 flex w-max gap-2 text-xs">
          <span className="border border-white/20 bg-black/30 px-2 py-1">
            {actionLabel('water')} 水球 {water || '就绪'}
          </span>
          {([0, 1] as const).map((slot) => {
            const partner = supports?.[slot];
            return (
              <span key={slot} className="border border-white/20 bg-black/30 px-2 py-1">
                {actionLabel(slot === 0 ? 'support1' : 'support2')}{' '}
                {partner ? `${partner.toUpperCase()} ${cds[partner] || '✓'}` : '未解锁'}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-right text-xs">
        <p className="font-serif text-lg text-[#e4d5ae]">{mapById(mapId).name}</p>
        <p className="mt-1 text-[#b7c9c4]">
          {mode === 'battle' ? mapById(mapId).objective : objective}
        </p>
        {canStartBattle && (
          <p className="mt-2 text-[#e6cb8b]">{actionLabel('interact')} 交互进入战斗</p>
        )}
        <ExplorationHud />
        <p className="mt-2 text-[#91aaa5]">
          {actionLabel('pause')} 暂停 · {actionLabel('interact')} 交互
        </p>
      </div>
    </div>
  );
}
