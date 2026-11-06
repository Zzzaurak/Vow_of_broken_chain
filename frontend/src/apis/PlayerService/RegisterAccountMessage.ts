import { sendMessage } from '../../api/transport';
export class RegisterAccountMessage {
  constructor(
    readonly username: string,
    readonly password: string,
  ) {}
  send(): Promise<string> {
    return sendMessage('PlayerService', 'RegisterAccountMessage', {
      username: this.username,
      password: this.password,
    });
  }
}
