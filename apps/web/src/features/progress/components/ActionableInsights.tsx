'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  type: 'improvement' | 'decline' | 'plateau' | 'achievement';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

interface ActionableInsightsProps {
  insights: Insight[];
  className?: string;
}

const insightConfig = {
  improvement: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  decline: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  plateau: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  achievement: { icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
};

export function ActionableInsights({ insights, className }: ActionableInsightsProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 && (
          <p className="text-sm text-muted-foreground">No insights available yet.</p>
        )}
        {insights.map((insight, index) => {
          const config = insightConfig[insight.type];
          const Icon = config.icon;
          return (
            <div
              key={index}
              className={cn('flex items-start gap-3 p-3 rounded-lg', config.bg)}
            >
              <Icon className={cn('h-5 w-5 mt-0.5', config.color)} />
              <div className="flex-1">
                <p className="text-sm font-medium">{insight.message}</p>
                <span className={cn(
                  'text-xs capitalize',
                  insight.priority === 'high' && 'text-red-600 font-semibold',
                  insight.priority === 'medium' && 'text-yellow-600',
                  insight.priority === 'low' && 'text-green-600',
                )}>
                  {insight.priority} priority
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
