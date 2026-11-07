import { create } from 'zustand';
import type { GameState } from '../objects/game';
const store = create<{ game: GameState | null }>(() => ({ game: null }));
export const getGameSnap = () => store.getState().game;
export const useGame = <T>(select: (game: GameState | null) => T) => store((s) => select(s.game));
export const setGame = (game: GameState | null) =>
  store.setState({
    game: game
      ? { ...game, administrator: game.administrator ?? getGameSnap()?.administrator }
      : null,
  });
export const updateGame = (f: (game: GameState) => GameState) => {
  const game = getGameSnap();
  if (game) setGame(f(game));
};
