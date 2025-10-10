import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, X } from "lucide-react";
import { getTrialStatus, type TrialStatus } from "@/lib/trial";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  orgId: string;
  onDismiss?: () => void;
}

export const TrialBanner = ({ orgId, onDismiss }: TrialBannerProps) => {
  const navigate = useNavigate();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadTrialStatus = async () => {
      const status = await getTrialStatus(orgId);
      setTrialStatus(status);
    };

    loadTrialStatus();
  }, [orgId]);

  if (!trialStatus || trialStatus.state === "paid" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const isWarning = trialStatus.state === "trial" && (trialStatus.daysLeft || 0) <= 3;
  const isExpired = trialStatus.state === "free";

  return (
    <div className={cn(
      "relative border-b px-4 py-3",
      isWarning ? "bg-warning/10 border-warning/20" : "bg-primary/5 border-primary/20",
      isExpired && "bg-muted border-border"
    )}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crown className={cn(
            "h-5 w-5",
            isWarning ? "text-warning" : "text-primary",
            isExpired && "text-muted-foreground"
          )} />
          <div>
            {trialStatus.state === "trial" && (
              <>
                <h3 className="font-semibold text-sm">
                  {isWarning 
                    ? "Trial ending soon—don't lose access to advanced AI features."
                    : `Your free trial ends in ${trialStatus.daysLeft} day${trialStatus.daysLeft === 1 ? '' : 's'}.`
                  }
                </h3>
                <p className="text-xs text-muted-foreground">
                  Keep Copilot, Predictive, Assessments & Culture DNA after your trial.
                </p>
              </>
            )}
            {isExpired && (
              <>
                <h3 className="font-semibold text-sm">
                  Trial ended—Upgrade to continue advanced features.
                </h3>
                <p className="text-xs text-muted-foreground">
                  You're now on the Free plan with limited features.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pricing')}
            className="hidden sm:flex"
          >
            View Plans
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className={cn(
              isWarning && "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
