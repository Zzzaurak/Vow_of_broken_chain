import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeSettings } from '../settings/store';
import { enableAudio, refreshAudioVolume, setSoundtrack, stopAudio } from './engine';
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
    const stopOnBlur = () => setSoundtrack('journey', true);
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    window.addEventListener('blur', stopOnBlur);
    const unsubscribe = subscribeSettings(refreshAudioVolume);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('blur', stopOnBlur);
      unsubscribe();
      stopAudio();
    };
  }, []);
  return null;
}
