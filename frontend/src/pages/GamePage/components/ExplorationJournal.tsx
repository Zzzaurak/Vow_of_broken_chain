import { useGame } from '../runtime/store';
import { regions, mapById, regionById, growthItems } from '../objects/content';
import { exploration, playerStats, exitAvailable } from '../functions/exploration';
export function ExplorationJournal() {
  const snapshot = useGame((g) => g?.snapshot);
  if (!snapshot) return null;
  const progress = exploration(snapshot),
    stats = playerStats(snapshot),
    region = regionById(snapshot.mapId);
  const found = regions.flatMap((r) =>
    r.points
      .filter((p) => progress.collected.includes(p.id))
      .map((p) => ({ place: mapById(r.mapId).name, point: p })),
  );
  return (
    <div className="space-y-4 text-sm text-[#d3dfd4]">
      <h3 className="font-serif text-xl text-[#e2cea0]">旅途手记</h3>
      <p>
        HP 上限 {stats.maxHp} · MP 上限 {stats.maxMp} · 每秒回复 {stats.regen} MP
      </p>
      <p>
        摆尾伤害 {stats.melee.toFixed(1)} · 水球伤害 {stats.water.toFixed(1)} · 爆炸半径{' '}
        {Math.round(stats.radius)}
      </p>
      <section>
        <h4 className="text-[#d7bc82]">当前区域通路</h4>
        <ul className="mt-2 space-y-1">
          {region.exits.map((e) => (
            <li key={e.id}>
              {{ north: '北', south: '南', west: '西', east: '东' }[e.side]} · {mapById(e.to).name}{' '}
              · {exitAvailable(snapshot, e) ? '可以通行' : '需完成剧情或机关'}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-[#d7bc82]">已发现的宝物</h4>
        {found.length ? (
          <ul className="mt-2 space-y-1">
            {found.map(({ place, point }) => (
              <li key={point.id}>
                {growthItems.find((i) => i.id === point.reward)?.name ?? '旅人补给'} · {place}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">还没有找到宝物，留意路牌与隐蔽角落。</p>
        )}
      </section>
      <section>
        <h4 className="text-[#d7bc82]">走过的地方</h4>
        <p className="mt-2 leading-relaxed">
          {progress.visited.map((id) => mapById(id).name).join(' · ')}
        </p>
      </section>
    </div>
  );
}
