import { getPlayerToken } from './token';
import { messageAction } from './naming';
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function sendMessage<T>(service: string, name: string, input: unknown): Promise<T> {
  const token = getPlayerToken();
  const response = await fetch(`/api/${service}/${messageAction(name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.code ?? 'request_failed',
      body.message ?? '请求失败，请重试。',
      response.status,
    );
  return body as T;
}
