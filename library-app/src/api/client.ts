// Small fetch wrapper for the ExpireGuard backend.
// Base URL: VITE_API_URL (e.g. https://api.example.com) or "/api", which the Vite dev server proxies to
// http://localhost:8000 (see vite.config.ts).

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'expireguard_token';
export const UNAUTHORIZED_EVENT = 'expireguard:unauthorized';

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled: the session lasts until reload */
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

/** Turns the backend's {"error": {"message", "details"}} envelope into a readable sentence. */
function messageFrom(data: unknown, fallback: string): { code: string; message: string; details?: unknown } {
  const error = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  if (!error) return { code: 'HTTP_ERROR', message: fallback };
  let message = error.message || fallback;
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details) && error.details.length) {
    const first = error.details[0] as { loc?: string[]; message?: string };
    const field = first.loc?.filter(part => part !== 'body').join('.') || '';
    message = `${field ? `${field}: ` : ''}${(first.message || message).replace(/^Value error, /, '')}`;
  }
  return { code: error.code || 'HTTP_ERROR', message, details: error.details };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: options.method ?? 'GET', headers, body, signal: options.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the ExpireGuard server. Check that the backend is running.');
  }

  if (response.status === 204) return undefined as T;
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data: unknown = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const { code, message, details } = messageFrom(isJson ? data : null, response.statusText || 'Request failed');
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, code, message, details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

/** Absolute URL for links the browser follows itself (e.g. file downloads). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
