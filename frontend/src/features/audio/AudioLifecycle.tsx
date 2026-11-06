import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeSettings } from '../settings/store';
import {
  enableAudio,
  refreshAudioVolume,
  setAudioFocused,
  setSoundtrack,
  stopAudio,
} from './engine';
export function AudioLifecycle() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/') setSoundtrack('journey');
  }, [location.pathname]);
  useEffect(() => {
    const start = () => {
      if (window.location.pathname === '/') setSoundtrack('journey');
      void enableAudio();
    };
    const stopOnBlur = () => setAudioFocused(false);
    const resumeOnFocus = () => setAudioFocused(!document.hidden);
    const visibility = () => setAudioFocused(!document.hidden && document.hasFocus());
    visibility();
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    window.addEventListener('blur', stopOnBlur);
    window.addEventListener('focus', resumeOnFocus);
    document.addEventListener('visibilitychange', visibility);
    const unsubscribe = subscribeSettings(refreshAudioVolume);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('blur', stopOnBlur);
      window.removeEventListener('focus', resumeOnFocus);
      document.removeEventListener('visibilitychange', visibility);
      unsubscribe();
      stopAudio();
    };
  }, []);
  return null;
}
