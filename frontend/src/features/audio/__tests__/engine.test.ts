import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../settings/store', () => ({
  getSettingsSnap: () => preferences,
}));
const preferences = { muted: false, master: 0.8, music: 0.6, effects: 0.5 };
const buses: { gain: { setTargetAtTime: ReturnType<typeof vi.fn> } }[] = [];
const frequencies: number[] = [];
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain() {
    const node = {
      gain: {
        setTargetAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    buses.push(node);
    return node;
  }
  createOscillator() {
    return {
      frequency: { setValueAtTime: (hz: number) => frequencies.push(hz) },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  buses.length = 0;
  frequencies.length = 0;
  Object.assign(preferences, { muted: false, master: 0.8, music: 0.6, effects: 0.5 });
});
afterEach(async () => {
  const { stopAudio } = await import('../engine');
  stopAudio();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('audio lifecycle', () => {
  it('focus gates all output without changing the soundtrack or advancing beats', async () => {
    const audio = await import('../engine');
    audio.setSoundtrack('frost');
    await audio.enableAudio();
    const count = frequencies.length;
    audio.setAudioFocused(false);
    expect(buses[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.035);
    // A game frame may select its soundtrack while the window stays unfocused.
    audio.setSoundtrack('frost');
    audio.playSound('confirm');
    vi.advanceTimersByTime(2000);
    expect(frequencies).toHaveLength(count);
    audio.setAudioFocused(true);
    expect(buses[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.8, 0, 0.035);
    vi.advanceTimersByTime(400);
    const { frequency } = await import('../composition');
    expect(frequencies[count]).toBeCloseTo(frequency(81));
  });
  it('pause fades music but leaves settings preview available and honors mute', async () => {
    const audio = await import('../engine');
    await audio.enableAudio();
    audio.setSoundtrack('journey', true);
    expect(buses[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.035);
    const count = frequencies.length;
    vi.advanceTimersByTime(2000);
    expect(frequencies).toHaveLength(count);
    audio.playSound('confirm');
    expect(frequencies).toHaveLength(count + 1);
    preferences.muted = true;
    audio.refreshAudioVolume();
    audio.setAudioFocused(false);
    audio.setAudioFocused(true);
    expect(buses[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.035);
    audio.setSoundtrack('journey', false);
    expect(buses[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.6, 0, 0.035);
    audio.stopAudio();
    expect(vi.getTimerCount()).toBe(0);
  });
});
