import { sendMessage } from '../../api/transport';
export class LogoutMessage {
  constructor(readonly token: string) {}
  send(): Promise<boolean> {
    return sendMessage('PlayerService', 'LogoutMessage', { token: this.token });
  }
}
