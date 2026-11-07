import { useGame, updateGame } from '../runtime/store';
export function AdministratorControls() {
  const admin = useGame((g) => g?.administrator);
  if (!admin?.authorized) return null;
  return (
    <fieldset className="rounded border border-amber-300/40 bg-slate-950/50 p-3 text-sm text-amber-100">
      <legend className="px-2">管理员调试</legend>
      {(['invincible', 'oneHit'] as const).map((key) => (
        <label key={key} className="mr-6 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={admin[key]}
            onChange={(event) => {
              const checked = event.target.checked;
              updateGame((g) =>
                g.administrator?.authorized
                  ? { ...g, administrator: { ...g.administrator, [key]: checked } }
                  : g,
              );
            }}
          />
          {key === 'invincible' ? '无敌' : '秒杀'}
        </label>
      ))}
      <p className="mt-2 text-xs text-slate-300">
        秒杀在命中时生效，保留 Boss 剧情与分波流程。开关仅作用于本次游戏。
      </p>
    </fieldset>
  );
}
