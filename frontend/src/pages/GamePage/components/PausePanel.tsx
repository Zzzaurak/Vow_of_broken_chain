import { SaveRecordButton } from '../../../features/saves/SaveRecordButton';
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { SettingsPanel } from '../../../features/settings/SettingsPanel';
import { useMenuNavigation } from '../../../features/settings/useMenuNavigation';
import { useGame, updateGame } from '../runtime/store';
import { canSave, configureSupport, retryCheckpoint, togglePause } from '../functions/progression';
import { mapById } from '../objects/content';
import type { usePersistence } from '../hooks/usePersistence';
export function PausePanel({ persistence }: { persistence: ReturnType<typeof usePersistence> }) {
  const game = useGame((g) =>
      g &&
      ['paused', 'failed', 'credits'].includes(g.mode.kind) &&
      (g.mode.kind !== 'failed' || g.mode.elapsed >= 0.9)
        ? g
        : null,
    ),
    navigate = useNavigate();
  const [tab, setTab] = useState<'main' | 'saves' | 'settings'>('main');
  const panel = useRef<HTMLElement>(null);
  const open = !!game && ['paused', 'failed', 'credits'].includes(game.mode.kind);
  const back = useCallback(() => {
    if (tab !== 'main') setTab('main');
    else if (game?.mode.kind === 'paused') updateGame(togglePause);
  }, [tab, game?.mode.kind]);
  useMenuNavigation(panel, back, open);
  if (!game || !['paused', 'failed', 'credits'].includes(game.mode.kind)) return null;
  const busy = persistence.status.kind === 'busy';
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#061219]/85 p-6 backdrop-blur-sm">
      <section
        ref={panel}
        data-game-menu
        className="max-h-full w-full max-w-xl overflow-y-auto border border-[#bfa970]/50 bg-[#102630] p-7"
      >
        <h2 className="mb-2 font-serif text-3xl text-[#e2cea0]">
          {game.mode.kind === 'failed'
            ? '旅途尚未结束'
            : game.mode.kind === 'credits'
              ? '自由，从此开始'
              : '旅途中歇'}
        </h2>
        <p className="mb-5 text-xs text-[#9bb0a8]">
          {game.mode.kind === 'failed'
            ? '回到最近检查点，重新出发。'
            : game.mode.kind === 'credits'
              ? '谨以此作，献给所有向往自由与真实的灵魂。'
              : mapById(game.snapshot.mapId).name}
        </p>
        <div className="mb-5 flex gap-2">
          {(['main', 'saves', 'settings'] as const).map((t) => (
            <Button
              key={t}
              className="flex-1 px-2! py-2!"
              onClick={() => {
                setTab(t);
                if (t === 'saves') void persistence.refreshList();
              }}
            >
              {t === 'main' ? '旅途' : t === 'saves' ? '存读档' : '设置'}
            </Button>
          ))}
        </div>
        {tab === 'main' && (
          <div className="space-y-3">
            {game.mode.kind === 'paused' && (
              <Button className="w-full" onClick={() => updateGame(togglePause)}>
                继续游戏
              </Button>
            )}
            {game.mode.kind === 'failed' && (
              <Button className="w-full" onClick={() => updateGame(retryCheckpoint)}>
                重试检查点 · 恢复 HP / MP
              </Button>
            )}
            {game.mode.kind === 'credits' && (
              <div className="space-y-3 py-4 text-center font-serif leading-loose text-[#cbd3bf]">
                <p>断链之誓 · 剧终</p>
                <p>
                  故事与企划：作者
                  <br />
                  角色与插画：社区素材及作者提供
                  <br />
                  程序与制作：AI 辅助课程项目
                </p>
                <p>谢谢你，赴这场约。</p>
              </div>
            )}
            {canSave(game) && game.snapshot.unlocked.length > 0 && (
              <div className="border border-white/10 p-3">
                <p className="mb-3 text-xs text-[#d8c690]">伙伴援助 · 换槽不重置冷却</p>
                {[0, 1].map((slot) => (
                  <label key={slot} className="mr-4 inline-flex gap-2 text-sm">
                    槽 {slot + 1}
                    <select
                      aria-label={`援助槽 ${slot + 1}`}
                      value={game.snapshot.supports[slot] ?? ''}
                      onChange={(e) =>
                        updateGame((g) =>
                          configureSupport(g, slot, e.target.value as 'glm' | 'gpt' | 'claude'),
                        )
                      }
                      className="bg-[#223d46]"
                    >
                      <option value="" disabled>
                        未解锁
                      </option>
                      {game.snapshot.unlocked.map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <Button className="w-full" disabled={busy} onClick={() => navigate('/')}>
              返回标题
            </Button>
          </div>
        )}
        {tab === 'saves' && (
          <div className="space-y-3">
            <p className="text-xs text-[#afc3bc]">
              手动保存只在安全状态开放。每次冒险有 5 个手动槽、3 条自动历史。
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((slot) => (
                <Button
                  key={slot}
                  className="px-1!"
                  disabled={busy || !canSave(game) || persistence.hasPending}
                  onClick={() => persistence.manual(slot)}
                >
                  存 {slot}
                </Button>
              ))}
            </div>
            {!canSave(game) && (
              <p className="text-xs text-amber-200">当前是战斗或剧情，暂不可保存。</p>
            )}
            {persistence.list?.adventures.map((a) => (
              <div key={a.id.value} className="border-t border-white/10 pt-3">
                <h3 className="mb-2 text-xs text-[#cfbd8a]">
                  {a.difficulty === 'easy' ? '简单' : '困难'} ·{' '}
                  {new Date(a.createdAt).toLocaleString('zh-CN', { hour12: false })}
                </h3>
                {persistence.list?.saves
                  .filter((s) => s.adventureId.value === a.id.value)
                  .map((s) => (
                    <SaveRecordButton
                      key={s.id.value}
                      save={s}
                      disabled={busy}
                      onLoad={(id) => void persistence.load(id)}
                    />
                  ))}
              </div>
            ))}
            <Button onClick={() => void persistence.refreshList()}>刷新记录</Button>
          </div>
        )}
        {tab === 'settings' && <SettingsPanel />}
        <p
          role="status"
          className={`mt-5 text-xs ${persistence.status.kind === 'error' ? 'text-rose-200' : 'text-[#8aa8a0]'}`}
        >
          {persistence.status.text}
        </p>
        {persistence.status.kind === 'error' && persistence.hasPending && (
          <Button className="mt-3" onClick={() => void persistence.retry()}>
            重试同一次请求
          </Button>
        )}
      </section>
    </div>
  );
}
