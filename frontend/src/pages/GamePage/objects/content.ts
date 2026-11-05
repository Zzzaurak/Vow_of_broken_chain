import mapsData from '../../../../../content/world/maps.json';
import encountersData from '../../../../../content/encounters/encounters.json';
import dialogueData from '../../../../../content/story/dialogue.json';
import combatData from '../../../../../content/balance/combat.json';
export interface WorldMap {
  id: string;
  name: string;
  width: number;
  height: number;
  theme: string;
  spawn: number[];
  exit: number[];
  next: string | null;
  obstacles: number[][];
  before: string | null;
  encounter: string | null;
  after: string | null;
  checkpoint: string;
}
export type EnemyKind = keyof typeof combatData.enemies;
export interface Encounter {
  id: string;
  waves: EnemyKind[][];
  rule: 'defeat' | 'surrender' | 'trial' | 'shield';
}
export interface DialogueLine {
  speaker: string;
  text: string;
}
export interface DialogueScene {
  id: string;
  title: string;
  lines: DialogueLine[];
}
export const maps: WorldMap[] = mapsData;
export const encounters = encountersData as Encounter[];
export const dialogue: DialogueScene[] = dialogueData;
export const balance = combatData;
export function mapById(id: string): WorldMap {
  const map = maps.find((m) => m.id === id);
  if (!map) throw new Error(`Unknown map ${id}`);
  return map;
}
export function sceneById(id: string): DialogueScene {
  const scene = dialogue.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
}
