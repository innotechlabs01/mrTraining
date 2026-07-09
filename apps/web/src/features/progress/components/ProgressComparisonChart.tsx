'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SportEntry {
  label: string;
  score: number;
  color: string;
  icon: React.ElementType;
}

interface ProgressComparisonChartProps {
  sports: SportEntry[];
  title?: string;
}

export function ProgressComparisonChart({ sports, title = 'Sport Comparison' }: ProgressComparisonChartProps) {
  const maxScore = 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sports.map((sport) => (
            <div key={sport.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{sport.label}</span>
                <span className="font-bold" style={{ color: sport.color }}>{sport.score}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-1"
                  style={{ width: `${(sport.score / maxScore) * 100}%`, backgroundColor: sport.color }}
                >
                  {sport.score > 15 && (
                    <span className="text-xs text-white font-bold">{sport.score}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
