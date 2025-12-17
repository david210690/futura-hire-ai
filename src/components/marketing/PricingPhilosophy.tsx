import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

export const PricingPhilosophy = () => {
  const points = [
    "Interviews are unlimited",
    "Rejected candidates don't count",
    "Withdrawn offers don't count",
    "Only accepted offers count as hires",
  ];

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Pricing that respects hiring reality
        </h2>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          FuturHire is priced annually based on successful hires — not resumes, interviews, or seats.
        </p>
        
        <ul className="space-y-3 mb-8 inline-block text-left">
          {points.map((point, index) => (
            <li key={index} className="flex items-center gap-3 text-foreground">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        
        <p className="text-sm text-muted-foreground mb-8">
          If you exceed your plan's included hires, additional hires are billed transparently.
        </p>
        
        <Button asChild variant="outline" size="lg">
          <Link to="/pricing">View plans</Link>
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          Checkout is enabled after pilot or sales confirmation.
        </p>
      </div>
    </section>
  );
};
