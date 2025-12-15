import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar } from "lucide-react";

interface LandingHeroProps {
  onApplyPilot: () => void;
}

export const LandingHero = ({ onApplyPilot }: LandingHeroProps) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Trust chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
              Candidates always free
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
              ND-safe by design
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
              Explainable — not a black box
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            Hiring clarity —{" "}
            <span className="text-primary">without the ATS chaos.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            FuturaHire helps teams run consistent, fair interviews using Role DNA, 
            structured question kits, and explainable decision rooms. Free for candidates.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={onApplyPilot}
              className="text-base px-8 py-6 h-auto"
            >
              Join Pilot (First 50 Companies)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-base px-8 py-6 h-auto"
              asChild
            >
              <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-4 w-4" />
                Book a Demo
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
