import { describe, expect, it } from 'vitest';
import { dialogueCast } from '../dialogueCast';
import { dialogue } from '../../objects/content';
describe('dialogue cast', () => {
  it('conceals the thief until her authored introduction', () => {
    const scene = dialogue.find((s) => s.id === '2-1')!;
    scene.lines.forEach((line, index) => {
      if (line.speaker === '神秘黑影')
        expect(dialogueCast(scene.lines, index).active).toBe('mystery');
      expect(dialogueCast(scene.lines, index).right).not.toBe('glm');
    });
    const camp = dialogue.find((s) => s.id === '4-C2')!;
    expect(camp.lines.map((l) => l.speaker)).toEqual(['大肥鱼', 'GPT', 'GPT', '大肥鱼']);
  });
  it('recognizes every authored speaker including the church and mysterious voice', () => {
    for (const scene of dialogue)
      scene.lines.forEach((line, index) => {
        if (line.speaker === '旁白') expect(dialogueCast(scene.lines, index).active).toBeNull();
        else expect(dialogueCast(scene.lines, index).active).not.toBeNull();
      });
  });
  it('retains the latest interlocutor when DeepSeek answers instead of reverting to the first companion', () => {
    const lines = ['Claude', 'D 教皇', '大肥鱼', 'GLM', '大肥鱼'].map((speaker) => ({
      speaker,
      text: '',
    }));
    expect(dialogueCast(lines, 1)).toEqual({ active: 'pope', right: 'pope' });
    expect(dialogueCast(lines, 2)).toEqual({ active: 'deepseek', right: 'pope' });
    expect(dialogueCast(lines, 4)).toEqual({ active: 'deepseek', right: 'glm' });
  });
});
