import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LandingHeroSectionProps {
  onApplyPilot: () => void;
}

export const LandingHeroSection = ({ onApplyPilot }: LandingHeroSectionProps) => {
  return (
    <section className="px-4 py-20 md:py-32 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          Hiring clarity — without the ATS chaos.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          FuturHire helps teams run consistent, fair interviews using Role DNA, structured question kits, and explainable decision rooms. Free for candidates.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button size="lg" className="text-base px-8" onClick={onApplyPilot}>
            Join Pilot (First 50 Companies)
          </Button>
          
          <Button variant="outline" size="lg" className="text-base px-8" asChild>
            <a href="mailto:hello@futurahire.app?subject=Demo Request">Book a Demo</a>
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            Candidates always free
          </Badge>
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            ND-safe by design
          </Badge>
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            Explainable — not a black box
          </Badge>
        </div>
      </div>
    </section>
  );
};
