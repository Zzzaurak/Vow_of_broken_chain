import { sendMessage } from '../../api/transport';
export class LoginMessage {
  constructor(
    readonly username: string,
    readonly password: string,
  ) {}
  send(): Promise<string> {
    return sendMessage('PlayerService', 'LoginMessage', {
      username: this.username,
      password: this.password,
    });
  }
}
