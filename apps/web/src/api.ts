import type {
  ApiError,
  Category,
  CreateRequestInput,
  Credentials,
  DemandCellsResponse,
  DemandRequest,
  PointDemandResponse,
  PublicUser,
} from '@ideas-map/shared';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>;
    throw new ApiRequestError(res.status, err.error ?? `Request failed (${res.status})`, err.details);
  }
  return data as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export interface DemandQuery {
  bbox: [number, number, number, number];
  zoom: number;
  category?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export const api = {
  me: () => request<PublicUser | null>('/auth/me'),
  login: (c: Credentials) => post<PublicUser>('/auth/login', c),
  register: (c: Credentials) => post<PublicUser>('/auth/register', c),
  logout: () => post<void>('/auth/logout'),
  categories: () => request<Category[]>('/categories'),
  myRequests: () => request<DemandRequest[]>('/requests/mine'),
  createRequest: (input: CreateRequestInput) => post<DemandRequest>('/requests', input),
  deleteRequest: (id: string) => request<void>(`/requests/${id}`, { method: 'DELETE' }),
  demand: ({ bbox, zoom, category }: DemandQuery, signal?: AbortSignal) =>
    request<DemandCellsResponse>(`/demand?${toQuery({ bbox: bbox.join(','), zoom, category })}`, {
      signal,
    }),
  pointDemand: (lat: number, lng: number, category?: string) =>
    request<PointDemandResponse>(`/demand/point?${toQuery({ lat, lng, category })}`),
};
