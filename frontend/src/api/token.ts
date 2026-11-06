const key = 'oath.player-token.v1';
const guestKey = 'oath.previous-guest.v1';
// An open game keeps its player identity when a different tab signs in.
let tabToken: string | null | undefined;
export function getPlayerToken(): string | null {
  if (tabToken === undefined) tabToken = localStorage.getItem(key);
  return tabToken;
}
export function setPlayerToken(token: string) {
  tabToken = token;
  localStorage.setItem(key, token);
}
export function enterAccount(token: string) {
  const guest = getPlayerToken();
  if (guest) localStorage.setItem(guestKey, guest);
  setPlayerToken(token);
}
export function leaveAccount() {
  const current = getPlayerToken();
  tabToken = undefined;
  if (localStorage.getItem(key) !== current) return;
  const guest = localStorage.getItem(guestKey);
  localStorage.removeItem(guestKey);
  if (guest) setPlayerToken(guest);
  else localStorage.removeItem(key);
}
