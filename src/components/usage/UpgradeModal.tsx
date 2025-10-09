import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  quotaExceeded?: boolean;
}

export const UpgradeModal = ({ open, onOpenChange, feature, quotaExceeded }: UpgradeModalProps) => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      features: [
        { name: "Basic AI Shortlist", included: true },
        { name: "3 shortlists/day", included: true },
        { name: "Video Analysis", included: false },
        { name: "Career Coach", included: false },
        { name: "Bias Analyzer", included: false },
        { name: "Marketing Assets", included: false },
      ],
    },
    {
      name: "Pro",
      price: "$49",
      popular: true,
      features: [
        { name: "Unlimited AI Shortlists", included: true },
        { name: "Video Analysis (20/day)", included: true },
        { name: "Career Coach (20/day)", included: true },
        { name: "Bias Analyzer", included: true },
        { name: "Marketing Assets", included: true },
        { name: "Priority Support", included: true },
      ],
    },
    {
      name: "Team",
      price: "$149",
      features: [
        { name: "Everything in Pro", included: true },
        { name: "Unlimited Video Analysis", included: true },
        { name: "Unlimited Coach Runs", included: true },
        { name: "Advanced Analytics", included: true },
        { name: "Custom Integrations", included: true },
        { name: "Dedicated Support", included: true },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quotaExceeded ? "Daily Limit Reached" : "Upgrade to Unlock"}
          </DialogTitle>
          <DialogDescription>
            {quotaExceeded
              ? "You've reached your daily limit. Upgrade to increase your quota or wait until tomorrow."
              : `Upgrade your plan to access ${feature || "this feature"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3 mt-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                {plan.popular && (
                  <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground"}>
                      {feature.name}
                    </span>
                  </div>
                ))}
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full mt-4"
                  disabled
                >
                  {plan.name === "Free" ? "Current Plan" : "Coming Soon"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Contact your admin to manually adjust entitlements for demo purposes.
        </p>
      </DialogContent>
    </Dialog>
  );
};
