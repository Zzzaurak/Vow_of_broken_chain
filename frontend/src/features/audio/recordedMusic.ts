import type { Score } from './composition';
/** One media source uses the existing music gain bus, including mute and focus fades. */
export function createRecordedMusic(context: AudioContext, bus: GainNode, initial: Score) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  const source = context.createMediaElementSource(audio);
  source.connect(bus);
  let score = initial,
    allowed = false,
    failed = false,
    playing = false;
  const play = () => {
    if (!allowed || failed || playing || !audio.paused) return;
    playing = true;
    void audio
      .play()
      .catch(() => {})
      .finally(() => {
        playing = false;
        if (!allowed) audio.pause();
      });
  };
  audio.addEventListener('canplay', play);
  audio.addEventListener('error', () => {
    failed = true;
  });
  audio.src = `/assets/music/${score}.mp3`;
  return {
    setTrack(next: Score) {
      if (score === next) return;
      audio.pause();
      score = next;
      failed = false;
      audio.src = `/assets/music/${score}.mp3`;
      audio.load();
      play();
    },
    setPlaying(value: boolean) {
      allowed = value;
      if (allowed) play();
      else audio.pause();
    },
    isPlaying: () => !audio.paused && audio.readyState >= 2,
    stop() {
      allowed = false;
      audio.pause();
      audio.removeEventListener('canplay', play);
      audio.removeAttribute('src');
      audio.load();
      source.disconnect();
    },
  };
}
