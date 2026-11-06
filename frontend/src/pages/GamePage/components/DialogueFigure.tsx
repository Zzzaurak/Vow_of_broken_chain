import { portrait } from '../runtime/assets';
import type { SpeakerFigure } from '../functions/dialogueCast';
const names = { pope: 'D 教皇', inquisitor: '教会审判长', deacon: '教会执事', mystery: '神秘声音' };
export function DialogueFigure({ figure, active }: { figure: SpeakerFigure; active: boolean }) {
  const className = `max-h-full w-[35%] object-contain object-bottom ${active ? '' : 'brightness-50'}`;
  if (figure !== 'pope' && figure !== 'inquisitor' && figure !== 'deacon' && figure !== 'mystery')
    return <img src={portrait(figure)} alt={figure} className={className} />;
  const pope = figure === 'pope';
  const mystery = figure === 'mystery';
  return (
    <svg
      viewBox="0 0 320 440"
      role="img"
      aria-label={`${names[figure]}剪影`}
      className={`${className} h-full`}
    >
      <ellipse cx="160" cy="415" rx="132" ry="18" fill="#071016" opacity=".6" />
      {!mystery && (
        <circle
          cx="160"
          cy="130"
          r="94"
          fill="none"
          stroke="#b39b5a"
          strokeWidth="3"
          opacity=".5"
        />
      )}
      <path
        d="M115 166 Q73 185 63 257 L24 419 Q160 441 296 419 L257 257 Q247 185 205 166Z"
        fill="#111821"
        stroke="#b39b5a"
        strokeWidth="3"
      />
      <path d="M113 171 L160 231 L207 171 L237 413 L83 413Z" fill="#26232b" />
      <path
        d="M119 181 L153 239 L138 414 M201 181 L167 239 L182 414"
        fill="none"
        stroke="#c1a55b"
        strokeWidth="5"
      />
      <path
        d="M107 148 Q99 81 160 65 Q221 81 213 148 L193 189 L127 189Z"
        fill="#080e16"
        stroke="#706341"
        strokeWidth="3"
      />
      {pope ? (
        <>
          <path d="M108 93 L120 27 L143 51 L160 12 L177 51 L200 27 L212 93Z" fill="#ad9357" />
          <path d="M117 80 L203 80 M160 29 L160 84" stroke="#e3d29a" strokeWidth="5" />
          <path d="M148 135 L156 135 M164 135 L172 135" stroke="#d8bb6a" strokeWidth="3" />
        </>
      ) : mystery ? (
        <path
          d="M108 105 L99 47 L137 83 M183 83 L221 47 L212 105"
          fill="#080e16"
          stroke="#706341"
          strokeWidth="3"
        />
      ) : (
        <path d="M120 112 L160 67 L200 112" fill="none" stroke="#a38d51" strokeWidth="4" />
      )}
      {!mystery && (
        <>
          <path d="M258 115 L258 414" stroke="#b39b5a" strokeWidth="7" />
          <path
            d={pope ? 'M258 70 L280 94 L258 119 L236 94Z' : 'M242 90 L274 90 M258 74 L258 118'}
            fill="#24202b"
            stroke="#d3bb79"
            strokeWidth="5"
          />
          <path d="M147 254 L173 254 M160 241 L160 276" stroke="#d3bb79" strokeWidth="5" />
        </>
      )}
    </svg>
  );
}
