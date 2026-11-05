import { sendMessage } from '../../api/transport';
import type { Id, GameSnapshot, ProgressResponse } from './types';
export class SaveProgressMessage {
  constructor(
    readonly adventureId: Id,
    readonly kind: 'auto' | 'manual',
    readonly slot: number,
    readonly snapshot: GameSnapshot,
    readonly operationId: string,
    readonly expectedRevision: number,
  ) {}
  send(): Promise<ProgressResponse> {
    return sendMessage('AdventureService', 'SaveProgressMessage', {
      adventureId: this.adventureId,
      kind: this.kind,
      slot: this.slot,
      snapshot: this.snapshot,
      operationId: this.operationId,
      expectedRevision: this.expectedRevision,
    });
  }
}
