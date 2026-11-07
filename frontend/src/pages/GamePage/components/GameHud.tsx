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
    mode = useGame((g) => g?.mode.kind);
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
    <div className="pointer-events-none absolute inset-x-0 top-0 isolate flex items-start justify-between gap-4 p-4">
      <div
        aria-hidden="true"
        data-hud-gradient
        className="absolute inset-x-0 top-0 -z-10 h-[10%] bg-gradient-to-b from-[#0a1c24]/95 to-transparent"
      />
      <div className="w-60 shrink-0">
        <div className="mb-2 flex justify-between font-serif text-sm tracking-widest text-[#e8dcc4]">
          <span className="font-bold">大肥鱼</span>
          <span>
            {hp}/{stats.maxHp} HP · {mp}/{stats.maxMp} MP
          </span>
        </div>
        <div className="h-3 rounded-sm border border-[#3e5a64]/50 bg-[#0a1c24]/80 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#c06548] to-[#d18d76]"
            style={{ width: `${(hp / stats.maxHp) * 100}%` }}
          />
        </div>
        <div className="mt-1.5 h-2 rounded-sm border border-[#3e5a64]/50 bg-[#0a1c24]/80 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#4a8a97] to-[#79bfcd]"
            style={{ width: `${(mp / stats.maxMp) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wider">
          <span className="rounded border border-[#4a8a97]/40 bg-[#0a1c24]/90 px-2 py-1 text-[#d8c690]">
            {actionLabel('water')} 水球 {water || '就绪'}
          </span>
          {([0, 1] as const).map((slot) => {
            const partner = supports?.[slot];
            return (
              <span
                key={slot}
                className="rounded border border-[#d8c690]/30 bg-[#0a1c24]/90 px-2 py-1 text-[#d8c690]"
              >
                {actionLabel(slot === 0 ? 'support1' : 'support2')}{' '}
                {partner ? `${partner.toUpperCase()} ${cds[partner] || '就绪'}` : '未解锁'}
              </span>
            );
          })}
        </div>
      </div>
      <div className="max-w-[42%] text-right">
        <p className="font-serif text-xl tracking-tight text-[#e4d5ae] drop-shadow-md">
          {mapById(mapId).name}
        </p>
        <p className="mt-1.5 font-sans text-xs text-[#a3b9b4]">
          {mode === 'battle' ? mapById(mapId).objective : objective}
        </p>
        {canStartBattle && (
          <p className="mt-2 animate-pulse font-bold text-[#f7e6b0]">
            {actionLabel('interact')} 交互进入战斗
          </p>
        )}
        <ExplorationHud />
        <p className="mt-4 font-mono text-[10px] uppercase text-[#a3b9b4]">
          {actionLabel('pause')} 暂停 · {actionLabel('interact')} 交互
        </p>
      </div>
    </div>
  );
}
