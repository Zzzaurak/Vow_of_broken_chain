import { sendMessage } from '../../api/transport';
import type { SaveListResponse } from './types';
export class ListSavesMessage {
  send(): Promise<SaveListResponse> {
    return sendMessage('AdventureService', 'ListSavesMessage', {});
  }
}
