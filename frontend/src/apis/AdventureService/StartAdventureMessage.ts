import { sendMessage } from '../../api/transport';
import type { Difficulty, ProgressResponse } from './types';
export class StartAdventureMessage {
  constructor(
    readonly difficulty: Difficulty,
    readonly operationId: string,
    readonly expectedRevision: number,
  ) {}
  send(): Promise<ProgressResponse> {
    return sendMessage('AdventureService', 'StartAdventureMessage', {
      difficulty: this.difficulty,
      operationId: this.operationId,
      expectedRevision: this.expectedRevision,
    });
  }
}
