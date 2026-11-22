import { useCallback, useMemo } from 'react';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { isR2Ref, presignReadBatch, resolveLegacyMediaUrl } from './mediaService';

const SIGNED_MEDIA_STALE_TIME_MS = 45 * 60 * 1000;
const SIGNED_MEDIA_GC_TIME_MS = 55 * 60 * 1000;

export function signedMediaQueryKey(ref: string): readonly ['media', 'signed', string] {
  return ['media', 'signed', ref] as const;
}

export interface SignedMediaUrlResult {
  url: string | undefined;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
}

/**
 * Resolves a media URL for display or playback.
 * - `http(s)://` and `/uploads/...` URLs are resolved synchronously without network calls.
 * - `r2://` refs are presigned via `POST /api/v1/media/presign-read` and cached in memory only.
 */
export function useSignedMediaUrl(rawUrl?: string | null): SignedMediaUrlResult {
  const queryClient = useQueryClient();
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  const needsPresign = isR2Ref(trimmed);
  const legacyUrl = needsPresign ? undefined : resolveLegacyMediaUrl(trimmed);

  const query = useQuery({
    queryKey: signedMediaQueryKey(trimmed),
    queryFn: async () => {
      const result = await presignReadBatch([trimmed]);
      const signed = result[trimmed]?.url;
      if (!signed) {
        throw new Error(`Missing presigned URL for ${trimmed}`);
      }
      return signed;
    },
    enabled: needsPresign,
    staleTime: SIGNED_MEDIA_STALE_TIME_MS,
    gcTime: SIGNED_MEDIA_GC_TIME_MS,
    retry: 1,
  });

  const invalidate = useCallback(async () => {
    if (!needsPresign) return;
    await queryClient.invalidateQueries({ queryKey: signedMediaQueryKey(trimmed) });
  }, [needsPresign, queryClient, trimmed]);

  const refresh = useCallback(async () => {
    if (!needsPresign) return;
    await queryClient.invalidateQueries({ queryKey: signedMediaQueryKey(trimmed) });
    await query.refetch();
  }, [needsPresign, query, queryClient, trimmed]);

  return {
    url: needsPresign ? query.data : legacyUrl,
    isLoading: needsPresign ? query.isLoading : false,
    isError: needsPresign ? query.isError : false,
    refresh,
    invalidate,
  };
}

export interface SignedMediaUrlsResult {
  urls: Record<string, string | undefined>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Resolves a list of media URLs (`r2://`, `http(s)://`, `/uploads/...`) in parallel,
 * sharing the per-ref React Query cache with `useSignedMediaUrl`.
 */
export function useSignedMediaUrls(
  rawUrls: Array<string | null | undefined>,
): SignedMediaUrlsResult {
  const queryClient = useQueryClient();

  const r2Refs = useMemo(
    () =>
      Array.from(
        new Set(
          rawUrls
            .map((u) => (typeof u === 'string' ? u.trim() : ''))
            .filter((u) => isR2Ref(u)),
        ),
      ),
    [rawUrls],
  );

  const queries = useQueries({
    queries: r2Refs.map((ref) => ({
      queryKey: signedMediaQueryKey(ref),
      queryFn: async () => {
        const result = await presignReadBatch([ref]);
        const signed = result[ref]?.url;
        if (!signed) {
          throw new Error(`Missing presigned URL for ${ref}`);
        }
        return signed;
      },
      staleTime: SIGNED_MEDIA_STALE_TIME_MS,
      gcTime: SIGNED_MEDIA_GC_TIME_MS,
      retry: 1,
    })),
  });

  const urls = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    const r2Map = new Map<string, string | undefined>();
    r2Refs.forEach((ref, idx) => {
      r2Map.set(ref, queries[idx]?.data);
    });

    for (const raw of rawUrls) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (isR2Ref(trimmed)) {
        map[raw] = r2Map.get(trimmed);
      } else {
        map[raw] = resolveLegacyMediaUrl(trimmed);
      }
    }
    return map;
  }, [queries, r2Refs, rawUrls]);

  const isLoading = queries.some((q) => q.isLoading);

  const refresh = useCallback(async () => {
    await Promise.all(
      r2Refs.map((ref) =>
        queryClient.invalidateQueries({ queryKey: signedMediaQueryKey(ref) }),
      ),
    );
  }, [queryClient, r2Refs]);

  return { urls, isLoading, refresh };
}
