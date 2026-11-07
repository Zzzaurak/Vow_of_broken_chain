/** Original, deterministic miniature scores. MIDI notes; 0 denotes a rest. */
export const compositions = {
  journey: {
    tempo: 96,
    melody: [72, 76, 79, 76, 74, 72, 67, 0, 69, 72, 76, 74, 72, 69, 67, 0],
    bass: [48, 53, 55, 48],
  },
  battle: {
    tempo: 128,
    melody: [69, 72, 76, 72, 71, 74, 77, 74, 69, 76, 81, 76, 74, 72, 71, 0],
    bass: [45, 41, 43, 40],
  },
  frost: {
    tempo: 78,
    melody: [74, 81, 78, 0, 76, 73, 69, 0, 74, 78, 81, 85, 81, 78, 76, 0],
    bass: [50, 47, 43, 45],
  },
  reunion: {
    tempo: 88,
    melody: [72, 76, 79, 84, 83, 79, 76, 0, 74, 77, 81, 79, 76, 74, 72, 0],
    bass: [48, 45, 53, 55],
  },
} as const;
export type Score = keyof typeof compositions;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function scoreFor(map: string, battle: boolean): Score {
  return battle
    ? 'battle'
    : ['lair', 'pass', 'snowline', 'icehall', 'camp'].includes(map)
      ? 'frost'
      : ['alley', 'garden', 'outpost'].includes(map)
        ? 'reunion'
        : 'journey';
}
