import { sendMessage } from '../../api/transport';
export class CreateAnonymousPlayerMessage {
  send(): Promise<{ token: string; revision: number }> {
    return sendMessage('PlayerService', 'CreateAnonymousPlayerMessage', {});
  }
}
