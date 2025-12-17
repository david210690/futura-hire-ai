import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Star } from "lucide-react";
import { createCheckoutSession } from "@/lib/razorpay";
import { useToast } from "@/hooks/use-toast";

interface LandingPricingProps {
  onApplyPilot: () => void;
  isPilotMode?: boolean;
}

const pilotPlan = {
  name: "Growth",
  description: "Pilot Exclusive",
  price: "₹30,000",
  priceValue: 30000,
  planKey: "pro" as const,
  features: [
    "Up to 25 successful hires per year",
    "Role DNA generation",
    "Interview Kits",
    "Question Bank Admin",
    "Decision Room",
    "Hiring Plan Autopilot",
    "Priority support",
  ],
};

const publicPlans = [
  {
    name: "Starter",
    description: "For small teams getting started",
    price: "₹18,000",
    priceValue: 18000,
    planKey: "starter" as const,
    hireLimit: 10,
    features: [
      "Up to 10 hires/year",
      "Role DNA generation",
      "Interview Kits",
      "Basic Decision Room",
    ],
  },
  {
    name: "Growth",
    description: "For growing hiring needs",
    price: "₹30,000",
    priceValue: 30000,
    planKey: "pro" as const,
    popular: true,
    hireLimit: 25,
    features: [
      "Up to 25 hires/year",
      "Everything in Starter",
      "Question Bank Admin",
      "Hiring Plan Autopilot",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    description: "For high-volume hiring",
    price: "₹60,000",
    priceValue: 60000,
    planKey: "team" as const,
    hireLimit: 50,
    features: [
      "Up to 50 hires/year",
      "Everything in Growth",
      "Advanced analytics",
      "Audit & compliance logs",
      "Dedicated onboarding",
    ],
  },
];

export const LandingPricing = ({ onApplyPilot, isPilotMode = true }: LandingPricingProps) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePilotApply = () => {
    onApplyPilot();
  };

  const handleSubscribe = async (plan: typeof publicPlans[0]) => {
    setLoadingPlan(plan.name);
    try {
      toast({
        title: "Join our Pilot Program",
        description: "Please apply for pilot access first. Once onboarded, you can subscribe to a plan.",
      });
      onApplyPilot();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {isPilotMode ? "Pilot Program Pricing" : "Simple, Transparent Pricing"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {isPilotMode 
              ? "Join our founding partners with exclusive access to the Growth plan."
              : "Pay only for successful hires. No hidden fees."
            }
          </p>
        </motion.div>

        {isPilotMode ? (
          // Pilot Mode: Show ONLY Growth Plan
          <div className="flex justify-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              <Card className="h-full relative border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                  <Badge variant="secondary">
                    Pilot Exclusive
                  </Badge>
                </div>
                <CardHeader className="text-center pb-4 pt-8">
                  <CardTitle className="text-2xl">{pilotPlan.name} Plan</CardTitle>
                  <CardDescription>{pilotPlan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground">
                      {pilotPlan.price}
                      <span className="text-sm font-normal text-muted-foreground">/year</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {pilotPlan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={handlePilotApply}
                    className="w-full"
                    size="lg"
                  >
                    Start Pilot on Growth Plan
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Pilot access is limited to the Growth plan to ensure consistent onboarding and support quality.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          // Public Mode: Show all plans
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {publicPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`h-full relative ${plan.popular ? 'border-primary shadow-lg' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {plan.price}
                        <span className="text-sm font-normal text-muted-foreground">/year</span>
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      onClick={() => handleSubscribe(plan)}
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full"
                      disabled={loadingPlan === plan.name}
                    >
                      {loadingPlan === plan.name ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Priced by successful hires per year. Interviews, rejected candidates, and preparation are never billed.
          </p>
          <p className="text-sm text-muted-foreground">
            Additional hires billed at ₹1,500 per successful hire.
          </p>
          {isPilotMode && (
            <p className="text-xs text-muted-foreground/70">
              Pilot companies are onboarded separately. Subscription begins after pilot completion.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};
