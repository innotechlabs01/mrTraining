'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  value: number;
}

interface ProgressTrendChartProps {
  data: DataPoint[];
  sportLabel: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function ProgressTrendChart({ data, sportLabel, color, trend, className }: ProgressTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg">{sportLabel} Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No trend data available.</p>
        </CardContent>
      </Card>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const chartHeight = 180;
  const chartWidth = 100;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - minVal) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(' ');

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span style={{ color }}>{sportLabel}</span>
          {trend && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              trend === 'up' && 'text-green-700 bg-green-100',
              trend === 'down' && 'text-red-700 bg-red-100',
              trend === 'stable' && 'text-yellow-700 bg-yellow-100',
            )}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'stable' && '→'}
              {' '}{trend}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1" style={{ height: chartHeight }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
            <polyline
              fill={`${color}15`}
              stroke="none"
              points={`0,${chartHeight} ${polylinePoints} ${chartWidth},${chartHeight}`}
            />
          </svg>
        </div>
        {data.length > 1 && (
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{data[0].date}</span>
            <span>{data[data.length - 1].date}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
