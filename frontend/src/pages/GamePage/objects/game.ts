import type { CinematicId, CinematicContinuation } from './cinematics';
import type { GameSnapshot, Partner } from '../../../apis/AdventureService/types';
import type { EnemyKind } from './content';
export interface Vec {
  x: number;
  y: number;
}
export type Direction = 'down' | 'up' | 'left' | 'right';
export type DialogueAfter = 'ready' | 'clear' | 'cg2' | 'epilogue' | 'finished' | 'fight';
export type WorldMode =
  | { kind: 'explore' }
  | { kind: 'battle' }
  | { kind: 'cinematic'; scene: CinematicId; elapsed: number; after: CinematicContinuation }
  | {
      kind: 'dialogue';
      scene: string;
      line: number;
      revealed: number;
      elapsed: number;
      hidden: boolean;
      history: boolean;
      after: DialogueAfter;
    }
  | { kind: 'failed'; elapsed: number }
  | { kind: 'credits' };
export type Mode = WorldMode | { kind: 'paused'; previous: WorldMode };
export type EnemyPhase = 'chase' | 'windup' | 'recover';
export interface Enemy {
  id: number;
  kind: EnemyKind;
  position: Vec;
  aim: Vec;
  hp: number;
  maxHp: number;
  shield: number;
  phase: EnemyPhase;
  timer: number;
  slowed: number;
  broken: number;
  attack: number;
  phaseTwo: boolean;
}
export interface Projectile {
  id: number;
  position: Vec;
  direction: Vec;
  target: Vec;
  speed: number;
  distance: number;
  damage: number;
  enemy: boolean;
  homing: boolean;
}
export interface Hazard {
  id: number;
  position: Vec;
  radius: number;
  timer: number;
  duration: number;
  damage: number;
  kind: 'blast' | 'bind' | 'petal';
  fired: boolean;
}
export interface VisualEffect {
  id: number;
  kind: 'water' | 'melee' | Partner;
  position: Vec;
  age: number;
  duration: number;
}
export interface PlayerAction {
  kind: 'melee' | 'cast';
  age: number;
  fired: boolean;
  aim: Vec;
  target: Vec;
}
export interface SupportCast {
  partner: Partner;
  age: number;
  fired: boolean;
  position: Vec;
  target: Vec;
}
export interface GameState {
  snapshot: GameSnapshot;
  checkpoint: GameSnapshot;
  mode: Mode;
  enemies: Enemy[];
  projectiles: Projectile[];
  hazards: Hazard[];
  effects: VisualEffect[];
  action: PlayerAction | null;
  casts: SupportCast[];
  aim: Vec;
  direction: Direction;
  moving: boolean;
  walkTime: number;
  meleeCooldown: number;
  invulnerable: number;
  bound: number;
  slow: number;
  barrier: number;
  wave: number;
  serial: number;
  simulationTime: number;
  autosave: number;
  dirty: boolean;
  toast: string;
  toastTime: number;
  lockedEnemy: number | null;
  calls: string[];
}
export interface FrameInput {
  move: Vec;
  aim: Vec | null;
  target: Vec | null;
  melee: boolean;
  water: boolean;
  support: 0 | 1 | null;
}
export const emptyInput: FrameInput = {
  move: { x: 0, y: 0 },
  aim: null,
  target: null,
  melee: false,
  water: false,
  support: null,
};
