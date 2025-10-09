import { Award, Trophy, Target, Zap, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeDisplayProps {
  badges: Array<{
    code: string;
    label: string;
    points: number;
    created_at: string;
  }>;
  size?: 'sm' | 'md' | 'lg';
}

const badgeIcons: Record<string, any> = {
  candidate_verified: Award,
  clear_communicator: Zap,
  practice_streak_7: Target,
  consistency_7: Trophy,
  fast_mover: TrendingUp,
  diversity_champion: Star,
};

const badgeDescriptions: Record<string, string> = {
  candidate_verified: 'Completed profile, resume & intro video',
  clear_communicator: 'Video communication score ≥ 75',
  practice_streak_7: '7-day career coach practice streak',
  consistency_7: 'Shortlist run 7 days in a row',
  fast_mover: 'Average time to shortlist < 24 hours',
  diversity_champion: 'Bias analyzer score ≥ 80',
};

export const BadgeDisplay = ({ badges, size = 'md' }: BadgeDisplayProps) => {
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const Icon = badgeIcons[badge.code] || Award;
          const description = badgeDescriptions[badge.code] || badge.label;

          return (
            <Tooltip key={badge.code}>
              <TooltipTrigger>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Icon size={iconSize} />
                  <span>{badge.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-medium">{badge.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {badge.points} points • Earned {new Date(badge.created_at).toLocaleDateString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {badges.length === 0 && (
          <p className="text-sm text-muted-foreground">No badges earned yet</p>
        )}
      </div>
    </TooltipProvider>
  );
};
