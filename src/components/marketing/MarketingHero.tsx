import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const MarketingHero = () => {
  return (
    <section className="relative px-4 py-24 md:py-32 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Main headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
          Pay for outcomes, not pipeline noise.
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
          Most hiring tools charge for resumes, seats, and activity — even when hiring doesn't happen.
        </p>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          FuturHire is different.
        </p>
        
        {/* Supporting line */}
        <p className="text-xl md:text-2xl font-semibold text-foreground mb-10">
          We count value only when an offer is accepted.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Button asChild size="lg" className="text-base px-8">
            <a 
              href="https://cal.com/futurahire/15min" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Request a 15-minute walkthrough
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8">
            <Link to="#pilot">Start with a Growth pilot</Link>
          </Button>
        </div>
        
        {/* Trust line */}
        <p className="text-sm text-muted-foreground">
          Candidates are always free. No scoring. No auto-rejection.
        </p>
      </div>
    </section>
  );
};
