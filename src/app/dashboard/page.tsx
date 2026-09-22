'use client';

import Link from 'next/link';
import { Activity, BookOpen, Eye, Heart, MessageCircle, Plus, Star, TrendingUp, UserRound } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { LoadingSpinner } from '@/components/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import type { LibraryAnalyticsResponse } from '@/lib/types';
import { useLibraryContext } from '@/context/library-context';
import { useEffect, useState } from 'react';

const stats = [
  { key: 'totalBooks', label: 'Total Book', icon: BookOpen },
  { key: 'publishedBooks', label: 'Book Published', icon: Star },
  { key: 'totalReaders', label: 'Total Reader', icon: UserRound },
  { key: 'totalViews', label: 'Total Views', icon: Eye },
  { key: 'totalLikes', label: 'Total Like', icon: Heart },
  { key: 'totalComments', label: 'Total Comment', icon: MessageCircle },
  { key: 'averageRating', label: 'Rata-rata Rating', icon: Star },
] as const;

const activityTones: Record<string, string> = {
  Published: 'bg-emerald-100 text-emerald-700',
  Reading: 'bg-blue-100 text-blue-700',
  Rating: 'bg-violet-100 text-violet-700',
  Like: 'bg-rose-100 text-rose-700',
  Highlight: 'bg-amber-100 text-amber-700',
};

function formatRelativeTime(date: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function formatDayLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date);
}

export default function DashboardIndexPage() {
  const library = useLibraryContext();
  const [analytics, setAnalytics] = useState<LibraryAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient<LibraryAnalyticsResponse>('/libraries/me/analytics')
      .then((data) => { if (!cancelled) setAnalytics(data); })
      .catch(() => { if (!cancelled) setError('Statistik Library belum dapat dimuat.'); });
    return () => { cancelled = true; };
  }, []);

  const growthData = analytics?.daily.map((day) => ({
    day: formatDayLabel(day.date),
    readerGrowth: day.readerGrowth,
    readingGrowth: day.readingGrowth,
  })) ?? [];

  const chartTooltipStyle = {
    borderRadius: '0.75rem',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Studio Library</p>
          <h1 className="text-3xl font-semibold tracking-tight">{library.nama}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pantau performa karya dan aktivitas pembaca Library kamu.</p>
        </div>
        <Button asChild><Link href="/dashboard/books"><Plus className="h-4 w-4" /> Kelola Book</Link></Button>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle>Pertumbuhan reader</CardTitle><CardDescription>Persentase perubahan reader unik harian.</CardDescription></div>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-semibold">{analytics ? `${(analytics.daily.at(-1)?.readerGrowth ?? 0).toLocaleString('id-ID')}%` : '-'}</p>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString('id-ID')}%`, 'Pertumbuhan']} contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="readerGrowth" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle>Pertumbuhan aktivitas membaca</CardTitle><CardDescription>Persentase perubahan sesi membaca harian.</CardDescription></div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-semibold">{analytics ? `${(analytics.daily.at(-1)?.readingGrowth ?? 0).toLocaleString('id-ID')}%` : '-'}</p>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString('id-ID')}%`, 'Pertumbuhan']} contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="readingGrowth" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : !analytics ? <LoadingSpinner label="Memuat statistik Library..." /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const value = analytics[stat.key];
              return <Card key={stat.key}><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 text-2xl font-semibold">{value.toLocaleString('id-ID', stat.key === 'averageRating' ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : undefined)}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>;
            })}
          </section>
          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader><CardTitle>Book terpopuler</CardTitle><CardDescription>Book milik Library dengan views tertinggi.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {analytics.topBooks.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada Book.</p> : analytics.topBooks.map((book, index) => (
                  <div key={book.bookId} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{book.title}</span><span className="text-sm text-muted-foreground">{Number(book.views ?? 0).toLocaleString('id-ID')} views</span></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Aktivitas terbaru</CardTitle><CardDescription>Aktivitas terbaru pada Book dan Chapter Library kamu.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {analytics.recentActivities.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada aktivitas terbaru.</p> : analytics.recentActivities.map((activity) => (
                  <div key={`${activity.title}-${activity.activityAt}`} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{activity.title}</p><span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(activity.activityAt)}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.detail}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] ${activityTones[activity.type] ?? 'bg-muted text-muted-foreground'}`}>{activity.type}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
