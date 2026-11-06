import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { getPlayerToken, enterAccount, leaveAccount, setPlayerToken } from '../../api/token';
import { ApiError } from '../../api/transport';
import { LoginMessage } from '../../apis/PlayerService/LoginMessage';
import { LogoutMessage } from '../../apis/PlayerService/LogoutMessage';
import { RegisterAccountMessage } from '../../apis/PlayerService/RegisterAccountMessage';
import { ListSavesMessage } from '../../apis/AdventureService/ListSavesMessage';
import { CreateAnonymousPlayerMessage } from '../../apis/PlayerService/CreateAnonymousPlayerMessage';
export function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const [busy, setBusy] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    async function read() {
      if (getPlayerToken()) {
        const data = await new ListSavesMessage().send();
        if (live) setAccount(data.username);
      }
    }
    read()
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (account) {
        try {
          await new LogoutMessage(getPlayerToken()!).send();
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        }
        leaveAccount();
      } else if (mode === 'register') {
        if (!getPlayerToken())
          setPlayerToken((await new CreateAnonymousPlayerMessage().send()).token);
        await new RegisterAccountMessage(username, password).send();
      } else {
        enterAccount(await new LoginMessage(username, password).send());
      }
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '账号操作失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-[#10252d] p-5">
      <section className="w-full max-w-md space-y-5 border border-[#baa977]/50 bg-[#0c1d24] p-8">
        <Link to="/" className="text-sm text-[#bbb897]">
          ← 返回标题
        </Link>
        <h1 className="font-serif text-3xl text-[#ebd9ad]">
          {account ? account : mode === 'register' ? '注册旅人账号' : '登录旅人账号'}
        </h1>
        <p className="text-sm text-[#aac1ba]">
          {account
            ? '使用此账号登录可继续你的冒险。'
            : mode === 'register'
              ? '注册后，这个游客的已有存档会归入新账号。'
              : '登录后可读取这个账号的存档。'}
        </p>
        <form onSubmit={submit} className="space-y-4">
          {!account && (
            <>
              <label className="block">
                用户名
                <input
                  required
                  autoComplete="username"
                  maxLength={32}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full bg-[#203a42] p-3"
                />
              </label>
              <label className="block">
                密码
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full bg-[#203a42] p-3"
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-200">
              {error}
            </p>
          )}
          <Button disabled={busy} className="w-full">
            {account ? '退出登录' : mode === 'register' ? '注册并保留存档' : '登录'}
          </Button>
        </form>
        {!account && (
          <button
            disabled={busy}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setPassword('');
            }}
            className="text-sm underline"
          >
            {mode === 'login' ? '注册新账号' : '已有账号，去登录'}
          </button>
        )}
      </section>
    </main>
  );
}
