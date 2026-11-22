'use client';

import React from 'react';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';

export function SignedMediaImg({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const { url } = useSignedMediaUrl(src);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

export function SignedMediaVideo({
  src,
  className,
  controls = true,
}: {
  src?: string | null;
  className?: string;
  controls?: boolean;
}) {
  const { url } = useSignedMediaUrl(src);
  if (!url) return null;
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <video src={url} controls={controls} className={className} />;
}
