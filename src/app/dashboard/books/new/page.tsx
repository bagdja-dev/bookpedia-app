'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { BookForm, type BookFormValues } from '@/components/book-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Book, CreateBookPayload } from '@/lib/types';

export default function NewBookPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: BookFormValues) {
    if (!values.judul || !values.slug) {
      toast.error('Judul dan slug Book wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateBookPayload = {
        judul: values.judul,
        slug: values.slug,
        ...(values.sinopsis ? { sinopsis: values.sinopsis } : {}),
        ...(values.genreId ? { genreId: values.genreId } : {}),
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.coverUrl ? { coverUrl: values.coverUrl } : {}),
        bookType: values.bookType,
        ...(values.originalAuthor ? { originalAuthor: values.originalAuthor } : {}),
        ...(values.maxFreeChapters.trim() !== '' ? { maxFreeChapters: Number(values.maxFreeChapters) } : {}),
      };
      const book = await apiClient<Book>('/books', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Book berhasil dibuat.');
      router.push(`/dashboard/books/${book.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat Book. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Book baru</CardTitle>
          <CardDescription>Isi detail Book — kamu bisa mulai menambahkan Chapter setelah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookForm mode="create" submitting={submitting} submitLabel="Buat Book" onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
