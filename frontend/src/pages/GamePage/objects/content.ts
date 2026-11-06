import explorationData from '../../../../../content/world/exploration.json';
import growthData from '../../../../../content/balance/growth.json';
import mapsData from '../../../../../content/world/maps.json';
import encountersData from '../../../../../content/encounters/encounters.json';
import dialogueData from '../../../../../content/story/dialogue.json';
import combatData from '../../../../../content/balance/combat.json';
export interface WorldMap {
  unlock: string | null;
  finalPreparation: boolean;
  objective: string;
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
  const point = regions.flatMap((r) => r.points).find((p) => `point:${p.id}` === id);
  if (point)
    return {
      id,
      title: point.name,
      lines: point.text
        .split('\n')
        .filter(Boolean)
        .map((text) => ({ speaker: point.kind === 'npc' ? point.name : '旁白', text })),
    };
  const scene = dialogue.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
}

export interface MapExit {
  id: string;
  to: string;
  side: 'north' | 'south' | 'west' | 'east';
  at: number;
  arrival: number[];
  requires: string[];
  travel: 'voyage' | null;
}
export interface ExplorationPoint {
  id: string;
  kind: 'npc' | 'sign' | 'chest' | 'camp' | 'switch' | 'breakable' | 'bridge' | 'book';
  name: string;
  position: number[];
  text: string;
  requires: string[];
  reward: string | null;
  scene: string | null;
  warp: number[] | null;
  blocker: number[] | null;
}
export interface Region {
  mapId: string;
  requires: string[];
  exits: MapExit[];
  points: ExplorationPoint[];
  enemySpawns?: number[][];
  trigger: number[];
  autoBattle: boolean;
  traps: { position: number[]; radius: number; period: number; damage: number }[];
}
export const regions = explorationData as Region[];
export const growthItems = growthData;
export const regionById = (id: string): Region => regions.find((r) => r.mapId === id)!;
export function enemyBehavior(kind: EnemyKind): EnemyKind {
  const spec = balance.enemies[kind];
  return 'behavior' in spec ? (spec.behavior as EnemyKind) : kind;
}
