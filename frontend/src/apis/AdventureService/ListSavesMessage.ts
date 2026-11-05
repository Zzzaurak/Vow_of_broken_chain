import { sendMessage } from '../../api/transport';
import type { Difficulty, Id, GameSnapshot, ProgressResponse, SaveListResponse } from './types';
export class ListSavesMessage {
  send(): Promise<SaveListResponse> {
    return sendMessage('AdventureService', 'ListSavesMessage', {});
  }
}
