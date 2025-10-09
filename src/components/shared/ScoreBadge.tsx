import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const ScoreBadge = ({ score, label, size = 'md', tooltip }: ScoreBadgeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-success/10 text-success border-success/20';
    if (score >= 40) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-semibold">{score}</span>
      {tooltip && <HelpCircle className="h-3 w-3 opacity-70" />}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};
