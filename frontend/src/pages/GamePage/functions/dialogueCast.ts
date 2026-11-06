import type { DialogueLine } from '../objects/content';
export type PortraitId = 'deepseek' | 'claude' | 'glm' | 'gpt' | 'qwen' | 'gemini';
export type SpeakerFigure = PortraitId | 'pope' | 'inquisitor' | 'deacon' | 'mystery' | 'villager';
const speakers: Record<string, SpeakerFigure> = {
  大肥鱼: 'deepseek',
  Claude: 'claude',
  GLM: 'glm',
  GPT: 'gpt',
  Qwen: 'qwen',
  Gemini: 'gemini',
  'D 教皇': 'pope',
  教会审判长: 'inquisitor',
  教会执事: 'deacon',
  神秘声音: 'mystery',
};
export function dialogueCast(lines: DialogueLine[], index: number) {
  const figure = (speaker: string): SpeakerFigure | null =>
    speaker === '旁白' ? null : (speakers[speaker] ?? 'villager');
  const active = figure(lines[index]?.speaker ?? '旁白');
  const prior = lines
    .slice(0, index + 1)
    .map((line) => figure(line.speaker))
    .filter((figure) => figure && figure !== 'deepseek')
    .at(-1);
  const upcoming = lines
    .slice(index + 1)
    .map((line) => figure(line.speaker))
    .find((figure) => figure && figure !== 'deepseek');
  return { active, right: active && active !== 'deepseek' ? active : (prior ?? upcoming ?? null) };
}
