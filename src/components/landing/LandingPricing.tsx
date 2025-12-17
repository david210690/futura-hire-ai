import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LandingPricingProps {
  onApplyPilot: () => void;
}

const plans = [
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
    disabled: true,
    disabledReason: "Not available in Pilot",
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
    disabled: false,
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
    disabled: true,
    disabledReason: "Not available in Pilot",
  },
];

export const LandingPricing = ({ onApplyPilot }: LandingPricingProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartPilot = async () => {
    setLoading(true);
    
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Store return path and redirect to signup
        sessionStorage.setItem('returnPath', '/recruiter/dashboard');
        sessionStorage.setItem('pilotSignup', 'true');
        navigate('/auth?mode=signup&pilot=growth');
        return;
      }
      
      // User is logged in - check if they're a recruiter
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (userRole?.role === 'candidate') {
        toast({
          title: "Candidate Account",
          description: "The pilot program is for hiring teams. Please sign up with a different email.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Redirect to recruiter dashboard (pilot activation happens there)
      navigate('/recruiter/dashboard');
      toast({
        title: "Welcome!",
        description: "Your Growth Pilot is active until 31 Mar 2026.",
      });
    } catch (error) {
      console.error('Error starting pilot:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 py-20 bg-muted/30" id="pricing">
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
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pay only for successful hires. No hidden fees.
          </p>
        </motion.div>

        {/* All plans grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`h-full relative ${
                plan.popular 
                  ? 'border-primary shadow-lg' 
                  : plan.disabled 
                    ? 'border-border/30 opacity-75' 
                    : 'border-border/50'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                    <Badge variant="secondary">
                      Pilot Exclusive
                    </Badge>
                  </div>
                )}
                {plan.disabled && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="outline" className="bg-background">
                      <Lock className="h-3 w-3 mr-1" />
                      {plan.disabledReason}
                    </Badge>
                  </div>
                )}
                <CardHeader className={`text-center pb-4 ${plan.popular ? 'pt-8' : 'pt-6'}`}>
                  <CardTitle className={`text-2xl ${plan.disabled ? 'text-muted-foreground' : ''}`}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${plan.disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/year</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.disabled 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span className={`text-sm ${plan.disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.disabled ? (
                    <Button 
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {plan.disabledReason}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStartPilot}
                      className="w-full"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Start Growth Pilot"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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
          <p className="text-xs text-muted-foreground/70 mt-4 p-3 bg-muted/50 rounded-lg inline-block">
            Pilot access is available only on Growth plan. Subscription is required after pilot ends.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
