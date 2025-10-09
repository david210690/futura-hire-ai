import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for trying out FuturaHire",
    features: [
      "Basic ATS functionality",
      "3 AI runs per day",
      "Up to 10 candidates",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹2,999",
    period: "/month",
    description: "For growing teams",
    features: [
      "AI Copilot access",
      "Unlimited assessments",
      "Predictive hire score",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Team",
    price: "₹7,999",
    period: "/month",
    description: "For larger organizations",
    features: [
      "Culture DNA mapping",
      "Video interview rules",
      "Gamification dashboard",
      "Advanced analytics",
      "Dedicated account manager",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For enterprise-scale hiring",
    features: [
      "Custom integrations",
      "On-premise deployment",
      "Unlimited everything",
      "24/7 premium support",
      "Custom SLA",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export const PricingSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Simple, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Transparent Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your hiring needs
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground z-10">
                  Most Popular
                </Badge>
              )}
              <Card className={`h-full bg-card/50 backdrop-blur-xl ${plan.popular ? 'border-primary shadow-[var(--glow-blue)]' : 'border-primary/20'}`}>
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90 shadow-[var(--glow-blue)]' : ''}`} 
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
