import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";

interface LandingPricingProps {
  onApplyPilot: () => void;
}

const plans = [
  {
    name: "Starter",
    description: "For small teams getting started",
    standardPrice: "₹18,000",
    betaPrice: "₹15,000",
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
    standardPrice: "₹36,000",
    betaPrice: "₹30,000",
    popular: true,
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
    standardPrice: "₹60,000",
    betaPrice: "₹50,000",
    features: [
      "Up to 50 hires/year",
      "Everything in Growth",
      "Advanced analytics",
      "Audit & compliance logs",
      "Dedicated onboarding",
    ],
  },
];

export const LandingPricing = ({ onApplyPilot }: LandingPricingProps) => {
  return (
    <section className="px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Checkout coming soon</span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan, index) => (
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
                  <div className="text-center space-y-2">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Standard</div>
                      <div className="text-2xl font-bold text-foreground">{plan.standardPrice}<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-primary font-medium">Beta Access</div>
                      <div className="text-2xl font-bold text-primary">{plan.betaPrice}<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
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
                    onClick={onApplyPilot}
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  >
                    Request Invoice / Start Pilot
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          Priced by hires per year. Additional hires billed at ₹1,500 per hire.
        </motion.p>
      </div>
    </section>
  );
};
