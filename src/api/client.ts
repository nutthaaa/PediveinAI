// Thin fetch wrapper for the PediVeinCare backend. Auth is an httpOnly session cookie,
// so images can be loaded with plain <img src="/api/images/..."> as well.

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : extractMessage(detail) ?? `HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

function extractMessage(detail: unknown): string | undefined {
  if (detail && typeof detail === 'object') {
    if ('message' in detail && typeof detail.message === 'string') return detail.message;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  return undefined;
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/login')) unauthorizedHandler?.();
    throw new ApiError(response.status, (data as { detail?: unknown })?.detail ?? data ?? response.statusText);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form),
};

export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
