/**
 * Client-side API helper — calls studio BFF proxy (reads httpOnly token
 * server-side, lihat lib/backend-api.ts + app/api/proxy).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`/api/proxy${normalized}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => message);
    }

    // 401 = sesi tidak valid (token expired/rusak) meski cookie `ns_user`
    // (dibaca useAuth untuk status login di UI) masih ada — sudah beberapa
    // kali kejadian saat testing: UI terlihat "login" tapi panggilan API
    // gagal diam-diam. Redirect ke login (bukan cuma throw error) supaya
    // pengguna langsung tahu harus login ulang, next= balik ke halaman ini.
    if (res.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth/login?next=${next}`;
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Unexpected end of JSON input', res.status);
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
