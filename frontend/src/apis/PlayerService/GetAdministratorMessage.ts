import { sendMessage } from '../../api/transport';
export class GetAdministratorMessage {
  send(): Promise<boolean> {
    return sendMessage('PlayerService', 'GetAdministratorMessage', {});
  }
}
