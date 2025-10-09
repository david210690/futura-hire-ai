import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface StreakDisplayProps {
  current: number;
  longest: number;
  metric: string;
  compact?: boolean;
}

const metricLabels: Record<string, string> = {
  coach_practice_daily: 'Practice Streak',
  shortlist_consistency: 'Consistency Streak',
};

export const StreakDisplay = ({ current, longest, metric, compact = false }: StreakDisplayProps) => {
  const label = metricLabels[metric] || 'Streak';

  if (compact) {
    return (
      <Badge variant={current > 0 ? "default" : "outline"} className="gap-1.5">
        <Flame className={`w-4 h-4 ${current > 0 ? 'text-orange-500' : ''}`} />
        <span>{label}: {current} days</span>
      </Badge>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${current > 0 ? 'bg-orange-100' : 'bg-muted'}`}>
              <Flame className={`w-6 h-6 ${current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{current} days</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Best</p>
            <p className="text-lg font-semibold">{longest} days</p>
          </div>
        </div>
        {current === 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Start practicing today to begin your streak!
          </p>
        )}
      </CardContent>
    </Card>
  );
};
