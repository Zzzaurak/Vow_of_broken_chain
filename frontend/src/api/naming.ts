export function messageAction(message: string): string {
  return message.replace(/Message$/, '').toLowerCase();
}
