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
        沿蓝色箭头走入围墙缺口即可前往下一站。在场地内按 {keyLabel(keys.interact)} 调查
        NPC、路牌、营火和机关。野外靠近魔物会进入战斗；Boss
        在场地内交互开战。岔路可往返，宝箱只领取一次，营地恢复资源和冷却并建立检查点。
      </p>
      <p>
        灵谷提升 HP 上限并回满生命，润珠提升 MP
        上限和回复速度，硬鳞强化摆尾，潮汐核心强化水球伤害和范围。先探索再推进主线，不必收齐宝物才能通关。浮桥和升降冰台靠近后调查跨越。
      </p>
      <p>
        GPT 会锁定角色朝向前方 90°
        扇形内最近的敌人，在落点造成范围伤害。无目标时不消耗冷却。移动时角色面向行进方向。攻击跟随瞄准或锁定目标。按住
        Ctrl（Mac 的 Control）快进对白和过场，松开恢复。
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
