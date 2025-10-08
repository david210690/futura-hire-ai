import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge = ({ score, label, size = 'md' }: ScoreBadgeProps) => {
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

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-semibold">{score}</span>
    </div>
  );
};
