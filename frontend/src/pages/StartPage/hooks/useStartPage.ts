import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerToken, setPlayerToken } from '../../../api/token';
import { CreateAnonymousPlayerMessage } from '../../../apis/PlayerService/CreateAnonymousPlayerMessage';
import { ListSavesMessage } from '../../../apis/AdventureService/ListSavesMessage';
import { StartAdventureMessage } from '../../../apis/AdventureService/StartAdventureMessage';
import { LoadAdventureMessage } from '../../../apis/AdventureService/LoadAdventureMessage';
import type { Difficulty, SaveListResponse } from '../../../apis/AdventureService/types';
import { ApiError } from '../../../api/transport';
import type { ProgressResponse } from '../../../apis/AdventureService/types';
import { setProgress } from '../../../features/saves/session';
type State =
  | { status: 'loading' }
  | { status: 'ready'; data: SaveListResponse }
  | { status: 'error'; message: string };
// Deduplicate mount requests, including React StrictMode remounts.
let identityRequest: Promise<void> | null = null;
function identity(): Promise<void> {
  if (getPlayerToken()) return Promise.resolve();
  if (!identityRequest)
    identityRequest = new CreateAnonymousPlayerMessage()
      .send()
      .then((r) => {
        setPlayerToken(r.token);
      })
      .finally(() => {
        identityRequest = null;
      });
  return identityRequest;
}
export function useStartPage() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const pending = useRef<{ key: string; send: () => Promise<ProgressResponse> } | null>(null);
  const running = useRef(false);
  async function refresh() {
    setState({ status: 'loading' });
    try {
      await identity();
      setState({ status: 'ready', data: await new ListSavesMessage().send() });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : '连接失败' });
    }
  }
  useEffect(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    void refresh();
  }, []);
  async function retry() {
    if (running.current || !pending.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    // Request during the button gesture; some browsers expire activation during a network request.
    const fullscreen =
      document.fullscreenEnabled && !document.fullscreenElement
        ? document.documentElement.requestFullscreen().catch(() => {})
        : Promise.resolve();
    try {
      const result = await pending.current.send();
      pending.current = null;
      setProgress(result);
      navigate('/game');
    } catch (e) {
      await fullscreen;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setError(e instanceof Error ? e.message : '操作失败');
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        pending.current = null;
        void refresh();
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function open(difficulty?: Difficulty, saveId?: string) {
    if (state.status !== 'ready' || running.current) return;
    const key = JSON.stringify([difficulty, saveId]);
    if (pending.current && pending.current.key !== key) {
      setError('上次请求的结果尚未确认，请先重试上次操作，避免重复创建冒险。');
      return;
    }
    if (!pending.current) {
      const op = crypto.randomUUID();
      const request = difficulty
        ? new StartAdventureMessage(difficulty, op, state.data.revision)
        : new LoadAdventureMessage({ value: saveId! }, op, state.data.revision);
      pending.current = { key, send: () => request.send() };
    }
    await retry();
  }
  return { state, busy, error, refresh, open, retry, hasPending: pending.current !== null };
}
