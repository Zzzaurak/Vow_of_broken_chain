import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProgressSnap } from '../../features/saves/session';
import { useGame, setGame, updateGame } from './runtime/store';
import { createGame, togglePause } from './functions/progression';
import { WorldCanvas } from './components/WorldCanvas';
import { BossStatus } from './components/BossStatus';
import { GameHud } from './components/GameHud';
import { DialoguePanel } from './components/DialoguePanel';
import { PausePanel } from './components/PausePanel';
import { usePersistence } from './hooks/usePersistence';
import { useSettings, keyLabel } from '../../features/settings/store';
export function GamePage() {
  const ready = useGame((g) => g !== null),
    mode = useGame((g) => g?.mode.kind),
    toast = useGame((g) => (g && g.toastTime > 0 ? g.toast : '')),
    settings = useSettings();
  const persistence = usePersistence();
  useEffect(() => {
    const progress = getProgressSnap();
    if (progress) setGame(createGame(progress.save.snapshot));
    return () => setGame(null);
  }, []);
  if (!ready)
    return (
      <main className="grid min-h-screen place-items-center">
        <Link className="border border-[#d1b879] px-8 py-4" to="/">
          返回标题并继续旅途
        </Link>
      </main>
    );
  const b = settings.bindings[settings.preset];
  return (
    <main className="min-h-screen bg-[#0b181f] px-4 py-5 md:px-10">
      <header className="mx-auto mb-4 flex max-w-[1280px] items-center justify-between border-b border-white/10 pb-4">
        <Link
          to="/"
          onClick={(e) => {
            e.preventDefault();
            updateGame(togglePause);
          }}
          className="font-serif text-xl tracking-[.2em] text-[#d8c48f]"
        >
          断链之誓
        </Link>
        <div className="flex items-center gap-5 text-xs text-[#91aaa5]">
          <span>{persistence.status.text}</span>
          <button onClick={() => updateGame(togglePause)}>暂停 / 菜单</button>
        </div>
      </header>
      <section className="relative mx-auto max-w-[1280px] overflow-hidden border border-[#86988a]/30 bg-[#24383d] shadow-2xl">
        <WorldCanvas />
        {mode !== 'dialogue' && <GameHud />}
        <BossStatus />
        <DialoguePanel />
        <PausePanel persistence={persistence} />
        {toast && mode !== 'paused' && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 bottom-5 text-center"
          >
            <span className="border border-[#b7a675]/40 bg-[#0b2029]/90 px-5 py-2 text-sm text-[#e4d6b0]">
              {toast}
            </span>
          </div>
        )}
      </section>
      <footer className="mx-auto mt-4 flex max-w-[1280px] flex-wrap justify-between gap-2 text-xs text-[#829e98]">
        <span>
          {[b.up, b.left, b.down, b.right].map(keyLabel).join(' ')} 移动 · {keyLabel(b.interact)}{' '}
          交互 · {keyLabel(b.melee)} 摆尾 · {keyLabel(b.water)} 深海之力 · {keyLabel(b.lock)} 锁定
        </span>
        <span>
          {settings.preset === 'keyboard'
            ? `${[b.aimUp, b.aimDown, b.aimLeft, b.aimRight].map(keyLabel).join(' ')} 瞄准 · ${keyLabel(b.support1)} / ${keyLabel(b.support2)} 援助`
            : `鼠标瞄准 · ${keyLabel(b.support1)} / ${keyLabel(b.support2)} 援助`}{' '}
          · Esc 暂停
        </span>
      </footer>
    </main>
  );
}
