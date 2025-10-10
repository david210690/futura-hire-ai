import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Users, Building2, Crown, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BILLING_CONFIG, grantDemoEntitlements } from "@/lib/entitlements";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    price: "₹2,999",
    period: "/month",
    description: "For growing teams",
    features: [
      "Unlimited job postings",
      "Advanced AI shortlist (unlimited)",
      "Unlimited video analysis",
      "Career coach & bias analyzer",
      "Priority support",
      "Up to 5 users",
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
      "Up to 10 users",
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
          plan: planId as 'pro' | 'team',  // Enterprise handled separately
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

  const comparisonFeatures = [
    { category: "Job Management", features: [
      { name: "Job Postings", free: "Up to 10", pro: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
      { name: "Custom Branding", free: false, pro: false, team: false, enterprise: true },
    ]},
    { category: "AI Features", features: [
      { name: "AI Shortlist", free: "5/day", pro: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
      { name: "Video Analysis", free: "3/day", pro: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
      { name: "Career Coach", free: false, pro: true, team: true, enterprise: true },
      { name: "Bias Analyzer", free: false, pro: true, team: true, enterprise: true },
      { name: "Predictive Scoring", free: false, pro: true, team: true, enterprise: true },
      { name: "AI Copilot", free: false, pro: true, team: true, enterprise: true },
    ]},
    { category: "Assessments", features: [
      { name: "Custom Assessments", free: "Basic", pro: "Advanced", team: "Advanced", enterprise: "Advanced" },
      { name: "Assessment Reports", free: true, pro: true, team: true, enterprise: true },
    ]},
    { category: "Team & Analytics", features: [
      { name: "User Seats", free: "1", pro: "Up to 5", team: "Up to 10", enterprise: "Unlimited" },
      { name: "Culture DNA Mapping", free: false, pro: false, team: true, enterprise: true },
      { name: "Advanced Analytics", free: false, pro: false, team: true, enterprise: true },
      { name: "Team Optimizer", free: false, pro: false, team: true, enterprise: true },
    ]},
    { category: "Support & SLA", features: [
      { name: "Support", free: "Standard", pro: "Priority", team: "Priority", enterprise: "24/7 Dedicated" },
      { name: "SLA Guarantee", free: false, pro: false, team: true, enterprise: true },
      { name: "Dedicated Account Manager", free: false, pro: false, team: true, enterprise: true },
    ]},
    { category: "Integration & Security", features: [
      { name: "Custom Integrations", free: false, pro: false, team: true, enterprise: true },
      { name: "On-premise Deployment", free: false, pro: false, team: false, enterprise: true },
      { name: "White-label Solution", free: false, pro: false, team: false, enterprise: true },
      { name: "Custom SLA", free: false, pro: false, team: false, enterprise: true },
    ]},
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

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

        {/* Detailed Comparison Table */}
        <div className="mt-24 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Detailed Feature Comparison</h2>
            <p className="text-muted-foreground">
              Compare all features across our plans to find the perfect fit
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[250px] font-bold">Feature</TableHead>
                    <TableHead className="text-center font-bold">Free</TableHead>
                    <TableHead className="text-center font-bold bg-primary/5">Pro</TableHead>
                    <TableHead className="text-center font-bold">Team</TableHead>
                    <TableHead className="text-center font-bold">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((category) => (
                    <>
                      <TableRow key={category.category} className="bg-muted/30">
                        <TableCell colSpan={5} className="font-bold text-base py-4">
                          {category.category}
                        </TableCell>
                      </TableRow>
                      {category.features.map((feature, idx) => (
                        <TableRow key={`${category.category}-${idx}`}>
                          <TableCell className="font-medium">{feature.name}</TableCell>
                          <TableCell className="text-center">
                            {typeof feature.free === 'boolean' ? (
                              feature.free ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="text-sm">{feature.free}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center bg-primary/5">
                            {typeof feature.pro === 'boolean' ? (
                              feature.pro ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="text-sm font-medium">{feature.pro}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {typeof feature.team === 'boolean' ? (
                              feature.team ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="text-sm">{feature.team}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {typeof feature.enterprise === 'boolean' ? (
                              feature.enterprise ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="text-sm">{feature.enterprise}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
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
