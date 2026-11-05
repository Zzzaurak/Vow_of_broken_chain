import { create } from 'zustand';
import type { ProgressResponse } from '../../apis/AdventureService/types';
interface Session {
  progress: ProgressResponse | null;
}
const store = create<Session>(() => ({ progress: null }));
export const useProgress = () => store((s) => s.progress);
export const getProgressSnap = () => store.getState().progress;
export const setProgress = (progress: ProgressResponse | null) => store.setState({ progress });
