export type Difficulty = 'easy' | 'hard';
export type Partner = 'glm' | 'gpt' | 'claude';
export type ProgressStage = 'arrival' | 'ready' | 'cleared' | 'ending' | 'finished';
export type Id = Readonly<{ value: string }>;
export interface GameSnapshot {
  schemaVersion: 1;
  contentVersion: '1.0.0';
  difficulty: Difficulty;
  mapId: string;
  position: { x: number; y: number };
  checkpoint: string;
  stage: ProgressStage;
  completed: string[];
  unlocked: Partner[];
  supports: Partner[];
  hp: number;
  mp: number;
  cooldowns: { water: number; glm: number; gpt: number; claude: number };
  playSeconds: number;
}
export interface SaveRecord {
  id: Id;
  adventureId: Id;
  kind: 'auto' | 'manual';
  slot: number;
  savedAt: string;
  snapshot: GameSnapshot;
}
export interface AdventureRecord {
  id: Id;
  difficulty: Difficulty;
  createdAt: string;
}
export interface ProgressResponse {
  revision: number;
  save: SaveRecord;
}
export interface SaveListResponse {
  revision: number;
  continueSave: string | null;
  adventures: AdventureRecord[];
  saves: SaveRecord[];
}
