'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressDashboardSkeletonProps {
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
        className
      )}
    />
  );
}

export function SportCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded-full" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-2.5 w-full rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressDashboardSkeleton({ className }: ProgressDashboardSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SportCardSkeleton />
        <SportCardSkeleton />
        <SportCardSkeleton />
        <SportCardSkeleton />
        <SportCardSkeleton />
        <SportCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <SkeletonBlock className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-4 w-8" />
                </div>
                <SkeletonBlock className="h-4 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SkeletonBlock className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-3">
                <SkeletonBlock className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1">
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
