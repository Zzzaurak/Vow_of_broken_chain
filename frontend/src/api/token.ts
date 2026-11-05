const key = 'oath.player-token.v1';
export const getPlayerToken = (): string | null => localStorage.getItem(key);
export const setPlayerToken = (token: string): void => localStorage.setItem(key, token);
