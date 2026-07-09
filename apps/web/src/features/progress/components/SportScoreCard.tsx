'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SportScoreCardProps {
  sportLabel: string;
  icon: React.ElementType;
  color: string;
  score: number;
  metrics: { label: string; value: string | number }[];
  className?: string;
}

export function SportScoreCard({ sportLabel, icon: Icon, color, score, metrics, className }: SportScoreCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2" style={{ borderLeft: `4px solid ${color}` }}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5" style={{ color }} />
          {sportLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2.5 mb-3">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
        <div className="space-y-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="font-medium">{metric.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
