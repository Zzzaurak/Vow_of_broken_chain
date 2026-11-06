import { useRef } from 'react';
import { useGame, updateGame } from '../runtime/store';
import { sceneById } from '../objects/content';
import { advanceDialogue, togglePause } from '../functions/progression';
import { DialogueFigure } from './DialogueFigure';
import { dialogueCast } from '../functions/dialogueCast';
import { useSettings, actionLabel } from '../../../features/settings/store';
export function DialoguePanel() {
  const mode = useGame((g) => (g?.mode.kind === 'dialogue' ? g.mode : null));
  const settings = useSettings();
  const suppressClick = useRef(false);
  if (mode?.kind !== 'dialogue') return null;
  const scene = sceneById(mode.scene),
    line = scene.lines[mode.line],
    { active: id, right } = dialogueCast(scene.lines, mode.line),
    cg = mode.scene === '6-1' ? 'cg1' : mode.scene === '6-2' ? 'cg2' : null;
  return (
    <div
      className="absolute inset-0 flex flex-col justify-end bg-[#061219]/35"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (settings.preset !== 'mouse') return;
        const code = `Mouse${e.button}`,
          b = settings.bindings.mouse;
        if (![b.confirm, b.hide, b.history, b.pause].includes(code)) return;
        e.preventDefault();
        suppressClick.current = true;
        if (code === b.confirm) updateGame(advanceDialogue);
        else if (code === b.pause) updateGame(togglePause);
        else
          updateGame((g) =>
            g.mode.kind === 'dialogue'
              ? {
                  ...g,
                  mode: {
                    ...g.mode,
                    hidden: code === b.hide ? !g.mode.hidden : g.mode.hidden,
                    history: code === b.history ? !g.mode.history : g.mode.history,
                  },
                }
              : g,
          );
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      {cg ? (
        <div className="absolute inset-x-0 top-0 bottom-[28%] flex items-center justify-center bg-[#09151a]">
          {cg === 'cg2' && mode.elapsed < 1 && (
            <img
              src="/assets/cg/cg1.png"
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          <img
            src={`/assets/cg/${cg}.png`}
            className="relative h-full w-full object-contain"
            style={{ opacity: Math.min(1, mode.elapsed) }}
            alt={cg === 'cg1' ? '晴空下，大肥鱼与 Claude 相拥' : '古龙 GPT 见证两人的重逢'}
          />
        </div>
      ) : (
        !mode.hidden && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[24%] top-10 flex items-end justify-between px-12">
            <DialogueFigure figure="deepseek" active={id === 'deepseek'} />
            {right && <DialogueFigure figure={right} active={id === right} />}
          </div>
        )
      )}
      {mode.scene === '6-3' && mode.elapsed < 0.7 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bottom-[28%] bg-[#09151a]"
          style={{ opacity: 1 - mode.elapsed / 0.7 }}
          aria-hidden="true"
        >
          <img src="/assets/cg/cg2.png" alt="" className="h-full w-full object-contain" />
        </div>
      )}
      {!mode.hidden && (!cg || mode.elapsed >= 1.5) && (
        <div className="relative min-h-[28%] border-t border-[#c8b47a]/50 bg-[#0c1c24]/95 px-8 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-lg tracking-widest text-[#e7ce8b]">
              {line.speaker}
            </span>
            <span className="text-[10px] tracking-widest text-[#75938f]">
              {scene.title} · {mode.line + 1}/{scene.lines.length}
            </span>
          </div>
          <button
            className="min-h-16 w-full text-left font-serif leading-relaxed text-[#e5e6da]"
            style={{ fontSize: settings.textSize }}
            onClick={() => updateGame((g) => advanceDialogue(g))}
          >
            {line.text.slice(0, Math.floor(mode.revealed))}
            <span className="ml-2 text-sm text-[#d6bf82]">
              {mode.revealed >= line.text.length ? '▾' : '▏'}
            </span>
          </button>
          <div className="mt-2 flex justify-between text-[11px] text-[#8aa39e]">
            <span>{actionLabel('confirm')} / 空格 补全或继续 · 按住 Ctrl 快进</span>
            <span>
              {actionLabel('hide')} 隐藏画面 · {actionLabel('history')} 本段记录
            </span>
          </div>
        </div>
      )}
      {mode.hidden && (
        <button
          className="absolute bottom-3 right-4 bg-black/50 px-3 py-2 text-xs"
          onClick={() =>
            updateGame((g) =>
              g.mode.kind === 'dialogue' ? { ...g, mode: { ...g.mode, hidden: false } } : g,
            )
          }
        >
          恢复文字 [{actionLabel('hide')}]
        </button>
      )}
      {mode.history && (
        <div className="absolute inset-6 overflow-auto border border-[#bca875] bg-[#0d2028]/98 p-6">
          <h2 className="mb-4 font-serif text-xl">本段对白</h2>
          {scene.lines.slice(0, mode.line + 1).map((l, i) => (
            <p key={i} className="mb-4 leading-relaxed">
              <span className="text-[#d8bf80]">{l.speaker}：</span>
              {l.text}
            </p>
          ))}
          <button
            onClick={() =>
              updateGame((g) =>
                g.mode.kind === 'dialogue' ? { ...g, mode: { ...g.mode, history: false } } : g,
              )
            }
          >
            返回 [{actionLabel('history')}]
          </button>
        </div>
      )}
    </div>
  );
}
