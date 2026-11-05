import { Link } from 'react-router-dom';
import { useProgress } from '../../features/saves/session';
export function GamePage() {
  const progress = useProgress();
  return <main className="mx-auto max-w-5xl p-12"><h1 className="font-serif text-4xl">旅途已建立</h1><p className="my-6">{progress ? `当前记录：${progress.save.snapshot.mapId} · HP ${progress.save.snapshot.hp} / MP ${progress.save.snapshot.mp}` : '请从标题页选择继续游戏。'}</p><p className="mb-8 text-slate-400">数据库闭环已连接，游戏场景正在实现。</p><Link className="underline" to="/">返回标题</Link></main>;
}
