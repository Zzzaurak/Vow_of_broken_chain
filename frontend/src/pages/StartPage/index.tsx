import { useState } from 'react';
import { ArrowRight, BookOpen, Sun, Swords } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useStartPage } from './hooks/useStartPage';
import type { Difficulty } from '../../apis/AdventureService/types';
export function StartPage() {
  const { state, busy, error, refresh, open } = useStartPage();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showSaves, setShowSaves] = useState(false);
  return <main className="relative min-h-screen overflow-hidden bg-[#101f25]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,#456869_0%,transparent_55%)]"/>
    <header className="relative flex items-center justify-between border-b border-white/10 px-8 py-6 text-xs tracking-[.3em] text-[#b4c3be]"><span>OATH / UNCHAINED</span><span>一场关于自由与约定的冒险</span></header>
    <section className="relative mx-auto grid max-w-6xl gap-12 px-8 py-20 md:grid-cols-[1.3fr_1fr]">
      <div><div className="mb-7 flex items-center gap-3 text-xs tracking-[.35em] text-[#d8bd7c]"><Sun size={17}/> 越过长夜 · 寻回你的光</div>
        <h1 className="font-serif text-7xl leading-tight tracking-[.12em] lg:text-8xl">断链之誓</h1>
        <p className="mt-5 text-sm tracking-[.45em] text-[#a8bcb8]">OATH UNCHAINED</p>
        <div className="my-10 h-px w-24 bg-[#c6ac70]"/>
        <p className="max-w-md font-serif text-xl leading-loose text-[#c5cfca]">跨过大洋，叩响古龙之门。<br/>去找那个与你约好，<br/>一起迷路的人。</p>
        <p className="mt-12 text-xs tracking-widest text-[#839c99]">像素冒险 / 即时战斗 / 一个温暖的结局</p>
      </div>
      <div className="self-center border border-[#bcad7e]/25 bg-[#0b161c]/65 p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3 text-xs tracking-[.25em] text-[#c9b782]"><BookOpen size={17}/> 旅途手记</div>
        {state.status === 'loading' && <p role="status">正在打开旅途手记…</p>}
        {state.status === 'error' && <div><p role="alert" className="mb-5 text-rose-200">{state.message}</p><Button onClick={() => void refresh()}>重试连接</Button></div>}
        {state.status === 'ready' && <div className="space-y-4">
          {state.data.continueSave && <Button disabled={busy} className="flex w-full items-center justify-between bg-[#c9b477]! text-[#172326]" onClick={() => void open(undefined, state.data.continueSave!)}>继续旅途 <ArrowRight size={18}/></Button>}
          <div className="flex gap-2">{(['easy','hard'] as const).map(d => <button key={d} aria-pressed={difficulty === d} className={`flex-1 border px-3 py-2 text-xs ${difficulty === d ? 'border-[#d6bf82] text-[#e8cd8b]' : 'border-white/10 text-[#93aaa7]'}`} onClick={() => setDifficulty(d)}>{d === 'easy' ? '简单 · 聆听故事' : '困难 · 迎接挑战'}</button>)}</div>
          <Button disabled={busy} className="flex w-full items-center justify-between" onClick={() => void open(difficulty)}>开启新的冒险 <Swords size={18}/></Button>
          <Button disabled={busy} className="w-full" onClick={() => setShowSaves(!showSaves)}>读取存档 · {state.data.saves.length} 条记录</Button>
          <p className="text-xs leading-relaxed text-[#8ea7a3]">每段新旅途独立保存。困难模式仅将敌人的生命与伤害翻倍。</p>
          {showSaves && <div className="max-h-64 space-y-2 overflow-auto">{state.data.saves.length === 0 ? <p className="py-4 text-sm">还没有旅途记录。</p> : state.data.saves.map(save => <button disabled={busy} key={save.id.value} className="w-full border border-white/10 p-3 text-left text-xs hover:bg-white/5" onClick={() => void open(undefined,save.id.value)}><span>{save.kind === 'auto' ? '自动' : `手动 ${save.slot}`} · {save.snapshot.mapId} · {save.snapshot.difficulty === 'easy' ? '简单' : '困难'}</span><span className="mt-1 block text-[#8ea7a3]">{new Date(save.savedAt).toLocaleString()}</span></button>)}</div>}
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
      </div>
    </section>
    <footer className="relative mx-8 flex justify-between border-t border-white/10 py-6 text-xs text-[#809792]"><span>献给所有向往自由与真实的灵魂</span><span>非官方同人 · 课程作品</span></footer>
  </main>;
}
