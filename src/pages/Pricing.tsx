import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Rocket, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BILLING_CONFIG } from "@/lib/billing-config";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!currentOrg) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to subscribe.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!BILLING_CONFIG.enabled) {
      toast({
        title: "Billing not configured",
        description: "Please contact support to enable billing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { createCheckoutSession } = await import("@/lib/razorpay");
      
      await createCheckoutSession({
        orgId: currentOrg.id,
        plan: 'pro', // Growth plan maps to 'pro' in Razorpay
        onSuccess: () => {
          toast({
            title: "Payment Successful! 🎉",
            description: "Your subscription is now active.",
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
  };

  const features = [
    "Unlimited job postings",
    "Role DNA & Interview Kits",
    "AI-powered candidate insights",
    "Decision Room with fairness checks",
    "Hiring Plan Autopilot",
    "Voice interview practice for candidates",
    "Up to 10 team members",
    "Priority support",
  ];

  const whatsIncluded = [
    { label: "Interviews conducted", included: true, note: "Unlimited" },
    { label: "Candidates evaluated", included: true, note: "Unlimited" },
    { label: "Rejections", included: true, note: "Not counted" },
    { label: "Withdrawn offers", included: true, note: "Not counted" },
    { label: "Actual hires", included: false, note: "Only this counts" },
  ];

  return (
    <SidebarLayout userRole="recruiter">
      <div className="p-6 max-w-4xl mx-auto">
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
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold">
            Pay for outcomes, not pipeline noise
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            We charge only when an offer is accepted and confirmed. Interviews, rejections, and withdrawn offers don't count.
          </p>
        </div>

        {/* Growth Plan Card */}
        <Card className="max-w-lg mx-auto p-8 border-primary shadow-lg shadow-primary/10">
          <div className="space-y-6">
            {/* Plan Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Growth Plan</h2>
                </div>
                <p className="text-muted-foreground mt-1">For teams ready to hire smarter</p>
              </div>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                Pilot Access
              </div>
            </div>

            {/* Pricing */}
            <div className="border-y border-border py-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold">₹30,000</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Billed annually • First 50 companies get pilot pricing
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <p className="font-medium">Everything you need:</p>
              <ul className="space-y-2">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <Button
              onClick={handleSubscribe}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Processing..." : "Subscribe Now"}
            </Button>
          </div>
        </Card>

        {/* What Counts Section */}
        <div className="mt-16 max-w-lg mx-auto">
          <h3 className="text-xl font-semibold text-center mb-6">
            What counts as a hire?
          </h3>
          <Card className="p-6">
            <ul className="space-y-4">
              {whatsIncluded.map((item, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <span className={`text-sm font-medium ${item.included ? 'text-muted-foreground' : 'text-primary'}`}>
                    {item.note}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                <strong className="text-foreground">No offer accepted = no hire counted.</strong>
                <br />
                Interview freely. Prepare candidates. Decide calmly.
              </p>
            </div>
          </Card>
        </div>

        {/* Enterprise */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">
            Need custom pricing or enterprise features?
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:support@futurahire.app" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Sales
            </a>
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
