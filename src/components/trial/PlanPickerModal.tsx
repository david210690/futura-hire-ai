import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Building2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PlanPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

const plans = [
  {
    id: "pro",
    name: "Pro",
    price: "₹2,999",
    period: "/month",
    description: "Perfect for small teams",
    icon: Sparkles,
    features: [
      "AI Copilot & Predictive Scoring",
      "30 AI Shortlists/day",
      "10 Video Analyses/day",
      "Advanced Assessments",
      "Culture DNA matching",
      "Email support"
    ]
  },
  {
    id: "team",
    name: "Team",
    price: "₹9,999",
    period: "/month",
    description: "Best for growing companies",
    icon: Crown,
    recommended: true,
    features: [
      "Everything in Pro, plus:",
      "Unlimited AI Shortlists",
      "Unlimited Video Analysis",
      "Team Optimizer",
      "Shareable shortlists + PDF export",
      "Role Designer",
      "Priority support",
      "Up to 10 users"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    icon: Building2,
    features: [
      "Everything in Team, plus:",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom training",
      "Advanced security",
      "Volume discounts"
    ]
  }
];

export const PlanPickerModal = ({ open, onOpenChange, orgId }: PlanPickerModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    if (planId === "enterprise") {
      window.location.href = "mailto:sales@futurahire.com?subject=Enterprise Plan Inquiry";
      return;
    }

    setLoading(true);
    
    try {
      const { BILLING_CONFIG } = await import("@/lib/entitlements");
      
      if (!BILLING_CONFIG.enabled) {
        toast({
          title: "Coming Soon",
          description: "Payment integration will be available soon.",
        });
        setTimeout(() => {
          setLoading(false);
          onOpenChange(false);
          navigate('/pricing');
        }, 1000);
        return;
      }

      const { createCheckoutSession } = await import("@/lib/razorpay");
      
      await createCheckoutSession({
        orgId,
        plan: planId as 'pro' | 'team',
        onSuccess: () => {
          toast({
            title: "Subscription Activated! 🎉",
            description: `Welcome to ${planId.charAt(0).toUpperCase() + planId.slice(1)}! All features unlocked.`,
          });
          onOpenChange(false);
          navigate('/dashboard');
        },
        onFailure: (error) => {
          toast({
            title: "Payment Failed",
            description: error.message || "Please try again.",
            variant: "destructive",
          });
          setLoading(false);
        }
      });
    } catch (error) {
      console.error("Plan selection error:", error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Unlock unlimited AI runs, Assessments, Culture DNA & more
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative p-6 transition-all hover:shadow-lg",
                  plan.recommended && "border-primary shadow-md"
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <Icon className={cn(
                    "h-6 w-6",
                    plan.recommended ? "text-primary" : "text-muted-foreground"
                  )} />
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.recommended ? "default" : "outline"}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loading}
                >
                  {plan.id === "enterprise" ? "Contact Sales" : "Get Started"}
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
