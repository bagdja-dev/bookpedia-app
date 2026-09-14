'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/loading-spinner';
import { BookForm, type BookFormValues } from '@/components/book-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Book, UpdateBookPayload } from '@/lib/types';

export default function EditBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient<Book>(`/books/${bookId}`);
        if (!cancelled) setBook(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat Book');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  async function handleSubmit(values: BookFormValues) {
    if (!values.judul) {
      toast.error('Judul Book wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: UpdateBookPayload = {
        judul: values.judul,
        sinopsis: values.sinopsis,
        genreId: values.genreId,
        categoryId: values.categoryId || null,
        coverUrl: values.coverUrl,
        bookType: values.bookType,
        originalAuthor: values.originalAuthor,
        status: values.status,
        maxFreeChapters: values.maxFreeChapters.trim() === '' ? null : Number(values.maxFreeChapters),
      };
      await apiClient<Book>(`/books/${bookId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Book berhasil diperbarui.');
      router.push(`/dashboard/books/${bookId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui Book. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">Gagal memuat Book: {error}</p>;
  }

  if (!book) {
    return <LoadingSpinner label="Memuat Book…" />;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit Book</CardTitle>
          <CardDescription>Perbarui detail Book kamu.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookForm
            mode="edit"
            submitting={submitting}
            submitLabel="Simpan Perubahan"
            onSubmit={handleSubmit}
            initialValues={{
              judul: book.judul,
              slug: book.slug,
              sinopsis: book.sinopsis ?? '',
              genreId: book.genre?.id ?? '',
              categoryId: book.category?.id ?? '',
              coverUrl: book.coverUrl ?? '',
              bookType: book.bookType,
              originalAuthor: book.originalAuthor ?? '',
              status: book.status,
              maxFreeChapters: book.maxFreeChapters === null ? '' : String(book.maxFreeChapters),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
