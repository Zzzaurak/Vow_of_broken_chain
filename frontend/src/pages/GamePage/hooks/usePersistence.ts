import { ApiError } from '../../../api/transport';
import { useEffect, useRef, useState } from 'react';
import { SaveProgressMessage } from '../../../apis/AdventureService/SaveProgressMessage';
import { LoadAdventureMessage } from '../../../apis/AdventureService/LoadAdventureMessage';
import { ListSavesMessage } from '../../../apis/AdventureService/ListSavesMessage';
import type { ProgressResponse, SaveListResponse } from '../../../apis/AdventureService/types';
import { getProgressSnap, setProgress } from '../../../features/saves/session';
import { getSettingsSnap } from '../../../features/settings/store';
import { canSave, createGame } from '../functions/progression';
import { getGameSnap, setGame, useGame } from '../runtime/store';
type Status =
  { kind: 'idle'; text: string } | { kind: 'busy'; text: string } | { kind: 'error'; text: string };
export function usePersistence() {
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '进度已载入' });
  const [list, setList] = useState<SaveListResponse | null>(null);
  const busy = useRef(false),
    pending = useRef<{
      send: () => Promise<ProgressResponse>;
      apply: (r: ProgressResponse) => void;
      kind: 'save' | 'load';
    } | null>(null);
  const counter = useGame((g) => g?.autosave ?? 0),
    lastAuto = useRef(0);
  const generation = useRef(0);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!getGameSnap()?.dirty && !pending.current) return;
      event.preventDefault();
      // Browsers supply their own wording and require a previous user gesture.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      generation.current++;
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
  async function execute() {
    if (busy.current || !pending.current) return;
    const request = pending.current,
      epoch = generation.current;
    busy.current = true;
    setStatus({ kind: 'busy', text: request.kind === 'load' ? '正在读取记录…' : '正在保存旅途…' });
    try {
      const response = await request.send();
      if (epoch !== generation.current) return;
      request.apply(response);
      pending.current = null;
      setStatus({ kind: 'idle', text: request.kind === 'load' ? '进度已载入' : '进度已保存' });
      void refreshList();
    } catch (error) {
      if (epoch === generation.current) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500)
          pending.current = null;
        setStatus({
          kind: 'error',
          text: error instanceof Error ? error.message : '请求失败，当前游戏仍保留。',
        });
      }
    } finally {
      busy.current = false;
    }
  }
  function save(kind: 'auto' | 'manual', slot = 0) {
    const game = getGameSnap(),
      progress = getProgressSnap();
    if (!game || !progress || !canSave(game) || busy.current || pending.current) return;
    const snapshot = structuredClone(game.snapshot);
    const request = new SaveProgressMessage(
      progress.save.adventureId,
      kind,
      slot,
      snapshot,
      crypto.randomUUID(),
      progress.revision,
    );
    pending.current = {
      kind: 'save',
      send: () => request.send(),
      apply: (r) => {
        setProgress(r);
        const current = getGameSnap();
        if (current && JSON.stringify(current.snapshot) === JSON.stringify(snapshot))
          setGame({ ...current, dirty: false });
      },
    };
    void execute();
  }
  useEffect(() => {
    if (counter === lastAuto.current || !getSettingsSnap().autosave) return;
    const game = getGameSnap();
    if (!game || !canSave(game) || busy.current || pending.current) return;
    lastAuto.current = counter;
    save('auto');
  }, [counter, status.kind]);
  async function refreshList() {
    try {
      const result = await new ListSavesMessage().send();
      setList(result);
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : '无法读取存档列表' });
    }
  }
  async function load(id: string) {
    const progress = getProgressSnap();
    if (!progress || busy.current) return;
    if (getGameSnap()?.dirty && !window.confirm('读取这条记录会放弃当前未保存进度。确定回档？'))
      return;
    if (pending.current && !window.confirm('上次保存尚未确认，读取后将放弃该次重试。确定读取？'))
      return;
    // An explicit load chooses the server branch. Fetch its current revision;
    // retaining the stale local revision here makes conflict recovery impossible.
    busy.current = true;
    const epoch = generation.current;
    setStatus({ kind: 'busy', text: '正在核对服务器进度…' });
    let latest: SaveListResponse;
    try {
      latest = await new ListSavesMessage().send();
      if (epoch !== generation.current) return;
      setList(latest);
    } catch (error) {
      if (epoch === generation.current)
        setStatus({
          kind: 'error',
          text: error instanceof Error ? error.message : '无法核对服务器进度，当前游戏仍保留。',
        });
      return;
    } finally {
      busy.current = false;
    }
    const request = new LoadAdventureMessage({ value: id }, crypto.randomUUID(), latest.revision);
    pending.current = {
      kind: 'load',
      send: () => request.send(),
      apply: (r) => {
        setProgress(r);
        const game = createGame(r.save.snapshot);
        lastAuto.current = game.autosave;
        setGame(game);
      },
    };
    void execute();
  }
  async function manual(slot: number) {
    if (busy.current || pending.current) return;
    busy.current = true;
    setStatus({ kind: 'busy', text: '正在核对存档槽…' });
    let latest: SaveListResponse;
    try {
      latest = await new ListSavesMessage().send();
      setList(latest);
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : '无法核对存档槽，未执行覆盖。',
      });
      busy.current = false;
      return;
    }
    busy.current = false;
    setStatus({ kind: 'idle', text: '存档槽已核对' });
    const progress = getProgressSnap();
    const old = latest.saves.find(
      (s) =>
        s.adventureId.value === progress?.save.adventureId.value &&
        s.kind === 'manual' &&
        s.slot === slot,
    );
    if (
      old &&
      !window.confirm(
        `覆盖手动槽 ${slot}？原记录：${old.snapshot.mapId} · ${new Date(old.savedAt).toLocaleString()}`,
      )
    )
      return;
    save('manual', slot);
  }
  return {
    status,
    list,
    manual,
    load,
    refreshList,
    retry: execute,
    hasPending: pending.current !== null,
  };
}
