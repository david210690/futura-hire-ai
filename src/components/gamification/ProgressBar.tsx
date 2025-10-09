import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  completion: number;
  label?: string;
  showPercentage?: boolean;
  showCheckmark?: boolean;
}

export const ProgressBar = ({ 
  completion, 
  label = "Profile Completion", 
  showPercentage = true,
  showCheckmark = true 
}: ProgressBarProps) => {
  const isComplete = completion >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {isComplete && showCheckmark && (
            <CheckCircle2 className="w-4 h-4 text-success" />
          )}
        </div>
        {showPercentage && (
          <span className={`text-sm font-medium ${isComplete ? 'text-success' : 'text-muted-foreground'}`}>
            {completion}%
          </span>
        )}
      </div>
      <Progress value={completion} className="h-2" />
      {!isComplete && (
        <p className="text-xs text-muted-foreground">
          Complete your profile, upload resume & video to unlock verification badge
        </p>
      )}
    </div>
  );
};
