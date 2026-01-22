'use client';

type ApiFetchOptions = RequestInit & {
  baseUrl?: string;
};

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}

export function getApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  const envToken = process.env.NEXT_PUBLIC_API_TOKEN;
  if (envToken && envToken.length > 0) return envToken;
  return window.localStorage.getItem('jwt_token');
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const baseUrl = options.baseUrl ?? getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);
  const token = getApiToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });
  if (typeof window !== 'undefined' && response.status === 401) {
    const pathname = window.location.pathname;
    if (pathname !== '/login' && pathname !== '/register') {
      window.localStorage.removeItem('jwt_token');
      window.localStorage.setItem('session_expired', '1');
      window.location.href = '/login';
    }
  }
  return response;
}
