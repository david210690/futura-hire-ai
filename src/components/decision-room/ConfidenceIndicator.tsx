import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, HelpCircle, Info } from "lucide-react";

interface ConfidenceIndicatorProps {
  confidence?: number;
  dataCompleteness?: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceIndicator({
  confidence,
  dataCompleteness,
  size = 'md',
  showLabel = true,
}: ConfidenceIndicatorProps) {
  if (confidence === undefined) return null;

  const getConfidenceLevel = (conf: number) => {
    if (conf >= 90) return { label: 'Very High', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
    if (conf >= 70) return { label: 'High', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 };
    if (conf >= 50) return { label: 'Moderate', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Info };
    if (conf >= 30) return { label: 'Low', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle };
    return { label: 'Very Low', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', icon: HelpCircle };
  };

  const getDataCompletenessInfo = (dc?: string) => {
    switch (dc) {
      case 'high': return { label: 'Complete data', description: 'All key information available' };
      case 'medium': return { label: 'Partial data', description: 'Some information gaps' };
      case 'low': return { label: 'Limited data', description: 'Significant data gaps' };
      default: return { label: 'Unknown', description: 'Data completeness not assessed' };
    }
  };

  const level = getConfidenceLevel(confidence);
  const dataInfo = getDataCompletenessInfo(dataCompleteness);
  const Icon = level.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${level.color} ${sizeClasses[size]} gap-1 cursor-help border-current/30`}
          >
            <Icon className={iconSizes[size]} />
            {showLabel && (
              <span>{confidence}% conf.</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div>
              <p className="font-medium">AI Confidence: {level.label}</p>
              <p className="text-xs text-muted-foreground">
                {confidence >= 70 
                  ? "This evaluation is based on sufficient data and clear signals."
                  : confidence >= 50
                  ? "Some data gaps exist. Consider gathering more information."
                  : "Limited data available. Treat as preliminary assessment."}
              </p>
            </div>
            {dataCompleteness && (
              <div className="pt-1 border-t">
                <p className="text-xs">
                  <span className="font-medium">Data: </span>
                  {dataInfo.label} - {dataInfo.description}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ConfidenceBarProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBar({ confidence, className }: ConfidenceBarProps) {
  const getBarColor = (conf: number) => {
    if (conf >= 90) return 'bg-green-500';
    if (conf >= 70) return 'bg-emerald-500';
    if (conf >= 50) return 'bg-yellow-500';
    if (conf >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">AI Confidence</span>
        <span className="font-medium">{confidence}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(confidence)} transition-all duration-300`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}
