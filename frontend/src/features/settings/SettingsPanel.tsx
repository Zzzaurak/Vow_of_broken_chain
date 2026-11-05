import { useEffect, useState, useRef } from 'react';
import { previewAudio } from '../audio/engine';
import { Button } from '../../components/ui/Button';
import { useSettings, setSettings, useSettingsNotice, dismissSettingsNotice } from './store';
import {
  actions,
  actionNames,
  defaults,
  keyLabel,
  bindingError,
  conflicts,
  rebind,
  type Action,
} from './model';
export function SettingsPanel() {
  const settings = useSettings(),
    notice = useSettingsNotice();
  const [recording, setRecording] = useState<Action | null>(null),
    [candidate, setCandidate] = useState<string | null>(null),
    [error, setError] = useState('');
  const bindings = settings.bindings[settings.preset];
  const applyButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (candidate) applyButton.current?.focus();
  }, [candidate]);
  const matches = recording && candidate ? conflicts(bindings, recording, candidate) : [];
  useEffect(() => {
    if (!recording || candidate) return;
    const capture = (code: string) => {
      if (code === 'Escape') {
        setRecording(null);
        setCandidate(null);
        return;
      }
      const message = bindingError(recording, code, settings.preset);
      setError(message ?? '');
      if (!message) setCandidate(code);
    };
    const keyboard = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey || (e.shiftKey && !e.code.startsWith('Shift'))) {
        setError('浏览器保留组合键不可绑定，请按一个独立按键。');
        return;
      }
      capture(e.code);
    };
    const mouse = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-binding-controls]')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      capture(`Mouse${e.button}`);
    };
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('mousedown', mouse, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('mousedown', mouse, true);
      window.dispatchEvent(new Event('oath:clear-input'));
    };
  }, [recording, settings.preset, candidate]);
  function apply() {
    if (!recording || !candidate) return;
    try {
      const next = rebind(bindings, recording, candidate, settings.preset, matches.length > 0);
      setSettings({ bindings: { ...settings.bindings, [settings.preset]: next } });
      setRecording(null);
      setCandidate(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法绑定');
    }
  }
  return (
    <div className="space-y-5 text-sm" data-rebinding={recording && !candidate ? 'true' : 'false'}>
      {notice && (
        <div role="alert" className="border border-amber-200/30 p-3 text-amber-100">
          {notice}
          <button className="ml-3 underline" onClick={dismissSettingsNotice}>
            知道了
          </button>
        </div>
      )}
      <label className="flex justify-between gap-3">
        控制方案
        <select
          aria-label="控制方案"
          className="bg-[#223d46]"
          value={settings.preset}
          onChange={(e) => setSettings({ preset: e.target.value as 'mouse' | 'keyboard' })}
        >
          <option value="mouse">键鼠模式</option>
          <option value="keyboard">纯键盘模式</option>
        </select>
      </label>
      <p className="text-xs text-[#9bb2ab]">
        {JSON.stringify(bindings) === JSON.stringify(defaults[settings.preset])
          ? '默认键位'
          : '自定义键位'}{' '}
        · 两套方案分别保存；同上下文冲突时可交换。Esc 始终可返回。
      </p>
      <details>
        <summary className="cursor-pointer text-[#dcc68c]" tabIndex={0}>
          编辑按键
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action}
              className="flex justify-between gap-2 border border-white/15 px-3 py-2 text-xs hover:bg-white/5"
              onClick={() => {
                setRecording(action);
                setCandidate(null);
                setError('');
              }}
            >
              <span>{actionNames[action]}</span>
              <span className="text-[#d9c389]">{keyLabel(bindings[action])}</span>
            </button>
          ))}
        </div>
      </details>
      {recording && (
        <div
          role="dialog"
          aria-label="录入按键"
          className="border border-[#d6bd7b] bg-[#1d3740] p-4"
        >
          <p>正在修改：{actionNames[recording]}</p>
          <p className="mt-2 text-xs text-[#b9cdc5]">
            {candidate ? `新键：${keyLabel(candidate)}` : '按下新键或鼠标键；Esc 取消。'}
          </p>
          {matches.length > 0 && (
            <p className="mt-2 text-amber-200">
              与「{matches.map((a) => actionNames[a]).join('、')}」冲突。
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-rose-200">
              {error}
            </p>
          )}
          <div data-binding-controls className="mt-3 flex gap-3">
            <Button
              ref={applyButton}
              disabled={!candidate || !!error || matches.length > 1}
              onClick={apply}
            >
              {matches.length ? '交换并应用' : '应用新键'}
            </Button>
            <Button
              onClick={() => {
                setRecording(null);
                setCandidate(null);
              }}
            >
              取消
            </Button>
          </div>
          <p className="mt-2 text-xs">
            录入后焦点自动移到应用按钮；按菜单确认键应用，Esc 取消或返回。
          </p>
        </div>
      )}
      <Button
        className="w-full"
        onClick={() =>
          setSettings({
            bindings: { ...settings.bindings, [settings.preset]: { ...defaults[settings.preset] } },
          })
        }
      >
        恢复当前方案默认键位
      </Button>
      <div className="space-y-3 border-t border-white/10 pt-4">
        {(['master', 'music', 'effects'] as const).map((key) => (
          <label key={key} className="flex items-center justify-between gap-3">
            {key === 'master' ? '总音量' : key === 'music' ? '背景音乐' : '音效'}{' '}
            {Math.round(settings[key] * 100)}%
            <input
              aria-label={key === 'master' ? '总音量' : key === 'music' ? '背景音乐' : '音效'}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings[key]}
              onChange={(e) => {
                setSettings({ [key]: Number(e.target.value) });
                previewAudio();
              }}
            />
          </label>
        ))}
        <label className="flex justify-between">
          静音
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(e) => setSettings({ muted: e.target.checked })}
          />
        </label>
      </div>
      <label className="flex justify-between">
        阅读速度
        <input
          aria-label="阅读速度"
          type="range"
          min="0"
          max="80"
          value={settings.textSpeed}
          onChange={(e) => setSettings({ textSpeed: Number(e.target.value) })}
        />
      </label>
      <p className="text-xs text-[#8aa8a0]">速度为 0 时即时显示全文。</p>
      <label className="flex justify-between">
        正文字号
        <input
          aria-label="正文字号"
          type="range"
          min="16"
          max="26"
          value={settings.textSize}
          onChange={(e) => setSettings({ textSize: Number(e.target.value) })}
        />
      </label>
      <label className="flex justify-between">
        屏幕震动
        <input
          type="checkbox"
          checked={settings.shake}
          onChange={(e) => setSettings({ shake: e.target.checked })}
        />
      </label>
      <label className="flex justify-between">
        减少强闪光
        <input
          type="checkbox"
          checked={settings.reduceFlash}
          onChange={(e) => setSettings({ reduceFlash: e.target.checked })}
        />
      </label>
      <label className="flex justify-between">
        自动保存
        <input
          type="checkbox"
          checked={settings.autosave}
          onChange={(e) => setSettings({ autosave: e.target.checked })}
        />
      </label>
      {!settings.autosave && (
        <p className="text-xs text-amber-200">
          自动保存已关闭，请在安全区域手动保存。旧记录仍可读取。
        </p>
      )}
    </div>
  );
}
