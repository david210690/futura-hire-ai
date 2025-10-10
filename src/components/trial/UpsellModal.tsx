import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { useState } from "react";
import { PlanPickerModal } from "./PlanPickerModal";

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  feature?: string;
  quotaExceeded?: boolean;
}

export const UpsellModal = ({ 
  open, 
  onOpenChange, 
  orgId,
  feature,
  quotaExceeded 
}: UpsellModalProps) => {
  const [showPlans, setShowPlans] = useState(false);

  const benefits = [
    "AI Copilot & Predictive Scoring",
    "AI Assessments & HD Video Analysis",
    "Culture DNA & Team Optimizer",
    "Shareable shortlists + PDF export"
  ];

  const handleUpgrade = () => {
    setShowPlans(true);
  };

  return (
    <>
      <Dialog open={open && !showPlans} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 mx-auto">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              {quotaExceeded ? "Daily Limit Reached" : "Unlock with Pro or Team"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {quotaExceeded 
                ? "You've reached your daily limit on the Free plan. Upgrade for unlimited access."
                : feature 
                  ? `${feature} is available on Pro and Team plans.`
                  : "You're on the Free plan. Upgrade for more AI runs and advanced features."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleUpgrade} className="w-full" size="lg">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </DialogContent>
      </Dialog>

      <PlanPickerModal
        open={showPlans}
        onOpenChange={(open) => {
          setShowPlans(open);
          if (!open) onOpenChange(false);
        }}
        orgId={orgId}
      />
    </>
  );
};
