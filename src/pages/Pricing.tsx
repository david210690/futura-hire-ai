import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Users, Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BILLING_CONFIG, grantDemoEntitlements } from "@/lib/entitlements";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

const plans = [
  {
    name: "Free",
    planId: "free",
    icon: Zap,
    price: "₹0",
    period: "/month",
    description: "Perfect for trying out FuturaHire",
    features: [
      "Up to 10 job postings",
      "Basic AI shortlist (5/day)",
      "Video analysis (3/day)",
      "Standard support",
      "1 user",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    planId: "pro",
    icon: Building2,
    price: "₹4,999",
    period: "/month",
    description: "For growing teams",
    features: [
      "Unlimited job postings",
      "Advanced AI shortlist (unlimited)",
      "Unlimited video analysis",
      "Career coach & bias analyzer",
      "Priority support",
      "Up to 5 users",
      "Custom branding",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    popular: true,
    trialDays: 14,
  },
  {
    name: "Team",
    planId: "team",
    icon: Users,
    price: "₹9,999",
    period: "/month",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Advanced analytics",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom AI training",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    popular: false,
    trialDays: 14,
  },
  {
    name: "Enterprise",
    planId: "enterprise",
    icon: Crown,
    price: "Custom",
    period: "",
    description: "Tailored for your needs",
    features: [
      "Everything in Team",
      "Custom SLA",
      "On-premise deployment",
      "White-label solution",
      "Unlimited everything",
      "24/7 dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlanClick = async (planId: string) => {
    if (!currentOrg) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to access features.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!BILLING_CONFIG.enabled) {
      // Demo mode: Grant full access with trial period
      try {
        const selectedPlan = plans.find(p => p.planId === planId);
        const trialDays = selectedPlan?.trialDays || 0;

        await grantDemoEntitlements(currentOrg.id);
        
        toast({
          title: "Access Granted! 🎉",
          description: trialDays > 0 
            ? `${trialDays}-day free trial started for ${selectedPlan?.name} plan!`
            : `Full access to ${selectedPlan?.name} plan activated.`,
        });

        navigate("/dashboard");
      } catch (error) {
        console.error("Error granting access:", error);
        toast({
          title: "Error",
          description: "Failed to grant access. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Real billing mode: Open Razorpay checkout
      setLoading(true);
      try {
        const { createCheckoutSession } = await import("@/lib/razorpay");
        
        await createCheckoutSession({
          orgId: currentOrg.id,
          plan: planId as 'pro' | 'team' | 'enterprise',
          onSuccess: () => {
            toast({
              title: "Payment Successful! 🎉",
              description: "Your subscription is now active. Enjoy unlimited features!",
            });
            navigate("/dashboard");
          },
          onFailure: (error) => {
            toast({
              title: "Payment Failed",
              description: error.message || "Please try again or contact support.",
              variant: "destructive",
            });
          }
        });
      } catch (error) {
        console.error("Checkout error:", error);
        toast({
          title: "Error",
          description: "Failed to initiate checkout. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (currentOrg) {
        // Grant demo entitlements
        await grantDemoEntitlements(currentOrg.id);
        
        toast({
          title: "Access Granted! 🎉",
          description: `Demo access to ${selectedPlan} plan features activated for your organization.`,
        });

        setShowWaitlist(false);
        navigate("/app/dashboard");
      } else {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to request access.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error granting access:", error);
      toast({
        title: "Error",
        description: "Failed to grant access. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start hiring smarter with AI-powered insights and automation
          </p>
          {!BILLING_CONFIG.enabled && (
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
              <p className="text-sm text-primary font-medium">
                🎁 Demo Mode Active - Full Features Available
              </p>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative p-6 space-y-6 transition-all hover:shadow-xl hover:scale-105 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => plan.planId === 'enterprise' ? window.location.href = 'mailto:sales@futurahire.com' : handlePlanClick(plan.planId)}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-muted-foreground">
            Need custom pricing or have questions?{" "}
            <a href="mailto:sales@futurahire.com" className="text-primary hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>

      {/* Waitlist/Request Access Modal */}
      <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Demo Access</DialogTitle>
            <DialogDescription>
              Get instant access to {selectedPlan} plan features in demo mode
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWaitlistSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your Company"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Granting Access..." : "Get Demo Access"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
