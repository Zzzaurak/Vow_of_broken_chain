import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerToken, setPlayerToken } from '../../../api/token';
import { CreateAnonymousPlayerMessage } from '../../../apis/PlayerService/CreateAnonymousPlayerMessage';
import { ListSavesMessage } from '../../../apis/AdventureService/ListSavesMessage';
import { StartAdventureMessage } from '../../../apis/AdventureService/StartAdventureMessage';
import { LoadAdventureMessage } from '../../../apis/AdventureService/LoadAdventureMessage';
import type { Difficulty, SaveListResponse } from '../../../apis/AdventureService/types';
import { setProgress } from '../../../features/saves/session';
type State = { status: 'loading' } | { status: 'ready'; data: SaveListResponse } | { status: 'error'; message: string };
// Deduplicate mount requests, including React StrictMode remounts.
let identityRequest: Promise<void> | null = null;
function identity(): Promise<void> {
  if (getPlayerToken()) return Promise.resolve();
  if (!identityRequest) identityRequest = new CreateAnonymousPlayerMessage().send().then(r => { setPlayerToken(r.token); }).finally(() => { identityRequest = null; });
  return identityRequest;
}
export function useStartPage() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function refresh() {
    setState({ status: 'loading' });
    try { await identity(); setState({ status: 'ready', data: await new ListSavesMessage().send() }); }
    catch (e) { setState({ status: 'error', message: e instanceof Error ? e.message : '连接失败' }); }
  }
  useEffect(() => { void refresh(); }, []);
  async function open(difficulty?: Difficulty, saveId?: string) {
    if (state.status !== 'ready' || busy) return;
    setBusy(true); setError('');
    try {
      const op = crypto.randomUUID();
      const result = difficulty ? await new StartAdventureMessage(difficulty, op, state.data.revision).send() : await new LoadAdventureMessage({ value: saveId! }, op, state.data.revision).send();
      setProgress(result); navigate('/game');
    } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setBusy(false); }
  }
  return { state, busy, error, refresh, open };
}
