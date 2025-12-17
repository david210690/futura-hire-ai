import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LandingPricingSectionProps {
  onApplyPilot: () => void;
}

export const LandingPricingSection = ({ onApplyPilot }: LandingPricingSectionProps) => {
  const plans = [
    {
      name: "Starter",
      price: "₹18,000",
      period: "/ year",
      description: "For occasional hiring teams",
      popular: false,
    },
    {
      name: "Growth",
      price: "₹30,000",
      period: "/ year",
      description: "For active hiring teams",
      popular: true,
      note: "Pilot access is provided on this plan",
    },
    {
      name: "Scale",
      price: "₹60,000",
      period: "/ year",
      description: "For high-volume hiring",
      popular: false,
    },
  ];

  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
          Pricing
        </h2>
        
        <p className="text-center text-muted-foreground mb-12">
          <Badge variant="outline" className="text-sm">Checkout coming soon</Badge>
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : 'border-border/50'}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.note && (
                  <p className="text-sm text-primary font-medium">{plan.note}</p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={onApplyPilot}
                >
                  Request Invoice / Start Pilot
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Priced by hires per year. Additional hires billed at ₹1,500 per hire.
        </p>
      </div>
    </section>
  );
};
