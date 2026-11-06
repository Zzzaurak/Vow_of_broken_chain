import { useState } from 'react';
import {
  actionNames,
  gameActions,
  dialogueActions,
  menuActions,
} from '../../../features/settings/model';
import { useSettings, keyLabel } from '../../../features/settings/store';
import { Button } from '../../../components/ui/Button';
export function HelpPanel({ onSettings }: { onSettings: () => void }) {
  const settings = useSettings();
  const [error, setError] = useState('');
  const keys = settings.bindings[settings.preset];
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError('请使用浏览器菜单进入全屏。');
    }
  }
  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-serif text-xl text-[#e2cea0]">冒险帮助</h3>
      <p>
        向地图出口前进，在场地内按 {keyLabel(keys.interact)} 开战。在入口休整可回满
        HP、MP。战斗与过场结束后可保存。
      </p>
      <p>
        移动时角色面向行进方向。攻击跟随瞄准或锁定目标。按住 Ctrl（Mac 的
        Control）快进对白和过场，松开恢复。
      </p>
      <div className="flex gap-2">
        <Button onClick={onSettings}>更改键位</Button>
        <Button onClick={fullscreen}>切换浏览器全屏</Button>
      </div>
      {error && <p role="status">{error}</p>}
      {(
        [
          ['探索与战斗', gameActions],
          ['对白', dialogueActions],
          ['菜单', menuActions],
        ] as const
      ).map(([label, actions]) => (
        <section key={label}>
          <h4 className="mb-2 text-[#d7bc82]">
            {label} · {settings.preset === 'mouse' ? '键鼠' : '纯键盘'}
          </h4>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1">
            {actions.map((a) => (
              <div key={a} className="flex justify-between gap-2">
                <dt>{actionNames[a]}</dt>
                <dd>{keyLabel(keys[a])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
