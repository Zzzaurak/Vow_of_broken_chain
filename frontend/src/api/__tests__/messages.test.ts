import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartAdventureMessage } from '../../apis/AdventureService/StartAdventureMessage';
import { ListSavesMessage } from '../../apis/AdventureService/ListSavesMessage';
import { ApiError } from '../transport';
import { messageAction } from '../naming';
vi.mock('../token', () => ({ getPlayerToken: () => 'test-token' }));
describe('course message contract', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('constructors do not send requests and only explicit fields are serialized', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ revision: 1 })));
    const message = new StartAdventureMessage('hard', 'operation-1', 0);
    expect(fetcher).not.toHaveBeenCalled();
    Object.assign(message, { accidental: 'must-not-leak' });
    await message.send();
    expect(fetcher.mock.calls[0][0]).toBe('/api/AdventureService/startadventure');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      difficulty: 'hard',
      operationId: 'operation-1',
      expectedRevision: 0,
    });
  });
  it('class renaming does not affect stable route derivation', () => {
    expect(messageAction('LoadAdventureMessage')).toBe('loadadventure');
    expect(messageAction('ListSavesMessage')).toBe('listsaves');
  });
  it('no-input requests send no business wrapper', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await new ListSavesMessage().send();
    expect(fetcher.mock.calls[0][1]!.body).toBe('{}');
  });
  it('backend errors preserve their code and human message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'revision_conflict', message: '进度已改变' }), {
        status: 409,
      }),
    );
    await expect(new ListSavesMessage().send()).rejects.toEqual(
      new ApiError('revision_conflict', '进度已改变', 409),
    );
  });
});
