import { balance } from '../objects/content';
import { useGame } from '../runtime/store';
const names: Record<string, string> = {
  glm: 'GLM · 狐耳怪盗',
  gpt: 'GPT · 古龙试炼',
  claude: 'Claude · 向日葵结界',
  pope: 'D 教皇 · 神格',
};
export function BossStatus() {
  const encoded = useGame((game) => {
    if (game?.mode.kind !== 'battle') return '';
    const boss = game.enemies.find((enemy) => enemy.kind in names);
    return boss
      ? JSON.stringify({
          kind: boss.kind,
          hp: Math.ceil(boss.hp),
          maxHp: boss.maxHp,
          shield: Math.ceil(boss.shield),
          phaseTwo: boss.phaseTwo,
        })
      : '';
  });
  if (!encoded) return null;
  const boss = JSON.parse(encoded) as {
    kind: string;
    hp: number;
    maxHp: number;
    shield: number;
    phaseTwo: boolean;
  };
  const maxShield =
    boss.kind === 'gpt' ? balance.enemies.gpt.shield : balance.enemies.claude.shield;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-[min(70%,480px)] border border-[#bba778]/35 bg-[#091c25]/90 px-4 py-3 text-xs">
      <div className="mb-2 flex justify-between text-[#e2c891]">
        <span>{names[boss.kind]}</span>
        <span>
          {boss.kind === 'pope'
            ? boss.phaseTwo
              ? '第二阶段'
              : '第一阶段'
            : boss.kind === 'gpt'
              ? '破盾后伤及本体即通过'
              : boss.kind === 'glm'
                ? '低于 30% 即认输'
                : '只破结界，不伤本体'}
        </span>
      </div>
      {boss.kind !== 'claude' && (
        <>
          <div className="mb-1 flex justify-between text-[#d3b5a5]">
            <span>本体 HP</span>
            <span>
              {boss.hp} / {boss.maxHp}
            </span>
          </div>
          <div
            role="meter"
            aria-label={`${names[boss.kind]} 本体 HP`}
            aria-valuemin={0}
            aria-valuemax={boss.maxHp}
            aria-valuenow={boss.hp}
            className="h-2 bg-black/50"
          >
            <div
              className="h-full bg-[#c67e70]"
              style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
            />
          </div>
        </>
      )}
      {(boss.kind === 'gpt' || boss.kind === 'claude') && (
        <>
          <div className="mb-1 mt-2 flex justify-between text-[#a7d5dc]">
            <span>{boss.kind === 'gpt' ? '龙鳞护盾' : '向日葵结界'}</span>
            <span>
              {boss.shield} / {maxShield}
            </span>
          </div>
          <div
            role="meter"
            aria-label={boss.kind === 'gpt' ? '龙鳞护盾' : '向日葵结界'}
            aria-valuemin={0}
            aria-valuemax={maxShield}
            aria-valuenow={boss.shield}
            className="h-2 bg-black/50"
          >
            <div
              className="h-full bg-[#81bfc6]"
              style={{ width: `${(boss.shield / maxShield) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
