import { useGame, updateGame } from '../runtime/store';
import { advanceCinematic } from '../functions/progression';
import { cinematics } from '../objects/cinematics';
import { useSettings, keyLabel } from '../../../features/settings/store';
export function CinematicPanel() {
  const mode = useGame((g) => (g?.mode.kind === 'cinematic' ? g.mode : null));
  const settings = useSettings();
  if (!mode) return null;
  const scene = cinematics[mode.scene];
  const caption = scene.captions[mode.elapsed < scene.duration / 2 ? 0 : 1];
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <div className="bg-[#061219]/95 px-8 py-4 text-center font-serif tracking-[.3em] text-[#e2c88e]">
        {scene.title}
      </div>
      <div className="bg-[#061219]/95 px-6 py-4 text-center">
        <p
          className="font-serif leading-relaxed text-[#e5e6da]"
          style={{ fontSize: settings.textSize }}
        >
          {caption}
        </p>
        <button
          className="pointer-events-auto mt-3 border border-[#c4ad76]/40 px-4 py-1 text-xs text-[#a8bcb2] disabled:opacity-30"
          disabled={mode.elapsed < 1.5}
          onClick={() => updateGame((g) => advanceCinematic(g, 0, true))}
        >
          跳过演出 [{keyLabel(settings.bindings[settings.preset].confirm)} / 空格]
        </button>
      </div>
    </div>
  );
}
