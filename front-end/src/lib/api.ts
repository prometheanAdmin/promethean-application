/*
 * API client for the Promethean FastAPI backend.
 *
 * Design decisions:
 *   - Single base URL from environment — one place to change for staging/prod.
 *   - Requests can attach a Clerk JWT automatically on the server, or accept a
 *     caller-provided token when used from client components.
 *   - Correlation IDs flow through every request for traceability.
 *   - API errors are typed and never silently swallowed.
 *   - Retryable failures use bounded exponential backoff.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly correlationId?: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthHeader(authToken?: string): Promise<string | null> {
  if (authToken) {
    return `Bearer ${authToken}`;
  }

  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { getToken } = await auth();
    const token = await getToken();
    return token ? `Bearer ${token}` : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  correlationId?: string;
  signal?: AbortSignal;
  authToken?: string;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, correlationId, signal, authToken } = options;
  const authHeader = await getAuthHeader(authToken);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });

      const responseCorrelationId =
        response.headers.get('x-correlation-id') ?? undefined;

      if (!response.ok) {
        let errorMessage = response.statusText;
        let errorCode = `HTTP_${response.status}`;
        let errorDetail: unknown;

        try {
          const errorBody = (await response.json()) as {
            detail?:
              | string
              | Array<{ msg: string }>
              | { code?: string; message?: string };
          };
          errorDetail = errorBody.detail;

          if (typeof errorBody.detail === 'string') {
            errorMessage = errorBody.detail;
          } else if (Array.isArray(errorBody.detail)) {
            errorMessage = errorBody.detail.map((detail) => detail.msg).join(', ');
          } else if (
            errorBody.detail &&
            typeof errorBody.detail === 'object' &&
            typeof errorBody.detail.message === 'string'
          ) {
            if (typeof errorBody.detail.code === 'string' && errorBody.detail.code) {
              errorCode = errorBody.detail.code;
            }
            errorMessage = errorBody.detail.message;
          }
        } catch {
          // Non-JSON response bodies fall back to the HTTP status text.
        }

        const error = new ApiError(
          response.status,
          errorCode,
          errorMessage,
          responseCorrelationId,
          errorDetail
        );

        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < MAX_RETRIES - 1
        ) {
          lastError = error;
          await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
          continue;
        }

        throw error;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (signal?.aborted) {
        throw error;
      }

      lastError = error;

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  put: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
} as const;
