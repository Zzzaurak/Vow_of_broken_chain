import { CinematicPanel } from './components/CinematicPanel';
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

export function GamePage() {
  const ready = useGame((g) => g !== null),
    mode = useGame((g) => g?.mode.kind),
    toast = useGame((g) => (g && g.toastTime > 0 ? g.toast : ''));
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
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-[#071318]">
      <section className="relative w-[min(100vw,177.7778dvh)] overflow-hidden bg-[#24383d]">
        <WorldCanvas />
        {mode !== 'dialogue' && mode !== 'cinematic' && <GameHud />}
        <BossStatus />
        <DialoguePanel />
        <CinematicPanel />
        <PausePanel persistence={persistence} />
        {toast && mode !== 'paused' && mode !== 'cinematic' && (
          <div
            role="status"
            className={`pointer-events-none absolute inset-x-0 text-center ${mode === 'battle' ? 'top-24' : 'bottom-5'}`}
          >
            <span className="border border-[#b7a675]/40 bg-[#0b2029]/90 px-5 py-2 text-sm text-[#e4d6b0]">
              {toast}
            </span>
          </div>
        )}
        {mode !== 'paused' && mode !== 'failed' && mode !== 'credits' && (
          <div className="absolute right-3 top-1/2 flex flex-col items-end gap-1 text-xs">
            <button
              className="bg-[#0a1c24]/85 px-3 py-2 text-[#d8c690]"
              onClick={() => updateGame(togglePause)}
            >
              Esc · 菜单
            </button>
            <span className="rounded bg-[#0a1c24]/75 px-2 py-1 text-[#b4c3be]">
              {persistence.status.text}
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
