import React from 'react';
import { ScreenHeader } from './ScreenHeader';

/**
 * @deprecated Use ScreenHeader with variant="sub" instead.
 * Alias kept so existing consumers keep working.
 */
export function SubScreenHeader({ title }: { title: string }) {
  return <ScreenHeader title={title} variant="sub" />;
}
