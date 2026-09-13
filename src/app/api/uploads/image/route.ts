/**
 * Route BFF KHUSUS untuk upload gambar (cover Library, dll) — bikin route
 * BARU (bukan lewat `app/api/proxy/[...path]/route.ts`) karena proxy generik
 * itu membaca body dengan `request.text()` yang akan merusak
 * `multipart/form-data` biner.
 *
 * Pola di-port PERSIS dari
 * `bagdja-auction-web/app/api/uploads/asset/route.ts`: baca `FormData`
 * masuk, bangun ULANG `FormData` baru, forward ke backend Bookpedia API dengan
 * Bearer token dari session cookie server-side (`lib/session.ts`, pola sama
 * yang dipakai `lib/backend-api.ts`).
 */
import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

export async function POST(request: NextRequest) {
  const { token } = await getSession();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = incoming.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });
  }

  const outgoing = new FormData();
  const filename = file instanceof File ? file.name : 'image.bin';
  outgoing.append('file', file, filename);

  const folder = incoming.get('folder');
  if (folder && typeof folder === 'string') {
    outgoing.append('folder', folder);
  }

  try {
    const res = await fetch(`${API_BASE}/uploads/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || res.statusText };
    }

    if (!res.ok) {
      const err = data as { message?: string; error?: string };
      return NextResponse.json(
        { error: err.message ?? err.error ?? 'Upload failed' },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
