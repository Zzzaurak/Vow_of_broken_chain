import { sendMessage } from '../../api/transport';
import type { Id, ProgressResponse } from './types';
export class LoadAdventureMessage {
  constructor(
    readonly saveId: Id,
    readonly operationId: string,
    readonly expectedRevision: number,
  ) {}
  send(): Promise<ProgressResponse> {
    return sendMessage('AdventureService', 'LoadAdventureMessage', {
      saveId: this.saveId,
      operationId: this.operationId,
      expectedRevision: this.expectedRevision,
    });
  }
}
