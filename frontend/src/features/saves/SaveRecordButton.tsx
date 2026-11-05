import type { SaveRecord } from '../../apis/AdventureService/types';
import { summarizeSave } from './summary';

export function SaveRecordButton({
  save,
  disabled,
  onLoad,
}: {
  save: SaveRecord;
  disabled: boolean;
  onLoad: (id: string) => void;
}) {
  const summary = summarizeSave(save);
  return (
    <button
      disabled={disabled}
      className="mb-2 w-full border border-white/10 px-3 py-3 text-left text-xs leading-relaxed hover:bg-white/5"
      onClick={() => onLoad(save.id.value)}
    >
      <span className="block text-[#e4d5ae]">{summary.title}</span>
      <span className="mt-1 block text-[#b7c9c4]">{summary.chapter}</span>
      <span className="block text-[#b7c9c4]">{summary.objective}</span>
      <span className="mt-1 block text-[#8aa8a0]">
        游玩 {summary.duration} · {summary.resources}
      </span>
      <span className="block text-[#8aa8a0]">保存于 {summary.savedAt}</span>
    </button>
  );
}
