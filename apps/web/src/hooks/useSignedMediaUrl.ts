'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mediaUrl } from '@/components/landing/data';

export function isR2Ref(url?: string | null): boolean {
  return typeof url === 'string' && url.trim().startsWith('r2://');
}

interface PresignReadResponse {
  urls?: Record<string, { url: string; expires_at: string }>;
  data?: { urls?: Record<string, { url: string; expires_at: string }> };
}

async function fetchSignedUrls(refs: string[]): Promise<Record<string, string>> {
  if (refs.length === 0) return {};
  const res = await fetch('/api/media/presign-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refs }),
  });
  if (!res.ok) return {};
  const json = (await res.json()) as PresignReadResponse;
  const map = json.data?.urls ?? json.urls ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v?.url) out[k] = v.url;
  }
  return out;
}

/**
 * Resolves a single media URL or canonical `r2://<key>` reference into a
 * browser-renderable URL. Non-R2 URLs (https://, /uploads/, data:) pass through immediately.
 */
export function useSignedMediaUrl(rawUrl?: string | null): {
  url: string;
  isLoading: boolean;
} {
  const trimmed = rawUrl?.trim() ?? '';
  const needsSigning = isR2Ref(trimmed);

  const { data, isLoading } = useQuery({
    queryKey: ['media', 'signed', trimmed],
    queryFn: async () => {
      const map = await fetchSignedUrls([trimmed]);
      return map[trimmed] ?? '';
    },
    enabled: needsSigning,
    staleTime: 45 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });

  if (!trimmed) return { url: '', isLoading: false };
  if (!needsSigning) return { url: mediaUrl(trimmed), isLoading: false };
  return { url: data ?? '', isLoading };
}

/**
 * Batch-resolves an array of URLs / `r2://` refs into a map keyed by original ref.
 */
export function useSignedMediaUrls(rawUrls: Array<string | null | undefined>): {
  urls: Record<string, string>;
  isLoading: boolean;
} {
  const r2Refs = useMemo(
    () =>
      Array.from(
        new Set(
          rawUrls
            .map((u) => u?.trim() ?? '')
            .filter((u) => isR2Ref(u)),
        ),
      ).sort(),
    [rawUrls],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['media', 'signed-batch', r2Refs],
    queryFn: () => fetchSignedUrls(r2Refs),
    enabled: r2Refs.length > 0,
    staleTime: 45 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });

  const resolved = useMemo(() => {
    const out: Record<string, string> = {};
    for (const raw of rawUrls) {
      const trimmed = raw?.trim() ?? '';
      if (!trimmed) continue;
      if (isR2Ref(trimmed)) {
        if (data?.[trimmed]) out[trimmed] = data[trimmed];
      } else {
        out[trimmed] = mediaUrl(trimmed);
      }
    }
    return out;
  }, [rawUrls, data]);

  return { urls: resolved, isLoading: r2Refs.length > 0 && isLoading };
}
