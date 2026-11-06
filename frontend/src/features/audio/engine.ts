import { getSettingsSnap } from '../settings/store';
import { compositions, frequency, type Score } from './composition';
let context: AudioContext | null = null;
let master: GainNode | null = null,
  music: GainNode | null = null,
  effects: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let score: Score = 'journey',
  beat = 0,
  paused = false,
  focused = true;
function tone(
  midi: number,
  duration: number,
  volume: number,
  channel: 'music' | 'effects',
  type: OscillatorType = 'triangle',
) {
  if (!context || context.state !== 'running' || !midi || !focused) return;
  const bus = channel === 'music' ? music : effects;
  if (!bus) return;
  const oscillator = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency(midi), now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(bus);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
function tick() {
  if (!context) return;
  const composition = compositions[score],
    duration = 60 / composition.tempo / 2;
  if (!paused && focused && context.state === 'running') {
    const melody = composition.melody[beat % composition.melody.length];
    tone(melody, duration * 0.85, 0.09, 'music');
    if (beat % 4 === 0) {
      const bass = composition.bass[Math.floor(beat / 4) % 4];
      tone(bass, duration * 3.5, 0.1, 'music', 'sine');
      tone(bass + 7, duration * 2.2, 0.025, 'music', 'sine');
    }
    beat++;
  }
  timer = setTimeout(tick, duration * 1000);
}
export function refreshAudioVolume() {
  if (!context) return;
  const settings = getSettingsSnap(),
    now = context.currentTime;
  master?.gain.setTargetAtTime(settings.muted || !focused ? 0 : settings.master, now, 0.035);
  music?.gain.setTargetAtTime(paused ? 0 : settings.music, now, 0.035);
  effects?.gain.setTargetAtTime(settings.effects, now, 0.035);
}
export async function enableAudio() {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      music = context.createGain();
      effects = context.createGain();
      music.connect(master);
      effects.connect(master);
      master.connect(context.destination);
      refreshAudioVolume();
      tick();
    }
    if (context.state === 'suspended') await context.resume();
  } catch {
    /* Audio availability never blocks gameplay. The browser may disallow playback. */
  }
}
export function setSoundtrack(next: Score, isPaused = false) {
  if (score !== next) {
    score = next;
    beat = 0;
  }
  if (paused !== isPaused) {
    paused = isPaused;
    refreshAudioVolume();
  }
}
export function setAudioFocused(value: boolean) {
  if (focused === value) return;
  focused = value;
  refreshAudioVolume();
}
export function playSound(
  kind: 'melee' | 'water' | 'glm' | 'gpt' | 'claude' | 'hurt' | 'ready' | 'error' | 'confirm',
) {
  const notes = {
    melee: 43,
    water: 81,
    glm: 63,
    gpt: 88,
    claude: 84,
    hurt: 35,
    ready: 91,
    error: 46,
    confirm: 76,
  };
  tone(
    notes[kind],
    kind === 'claude' ? 0.7 : kind === 'gpt' ? 0.5 : 0.18,
    kind === 'hurt' ? 0.16 : 0.11,
    'effects',
    kind === 'hurt' || kind === 'melee' ? 'sawtooth' : 'sine',
  );
}
export function previewAudio() {
  void enableAudio().then(() => playSound('confirm'));
}
export function stopAudio() {
  if (timer) clearTimeout(timer);
  timer = null;
  const old = context;
  context = null;
  master = null;
  music = null;
  effects = null;
  if (old) void old.close().catch(() => {});
}
