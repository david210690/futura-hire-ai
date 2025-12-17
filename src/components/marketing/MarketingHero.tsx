import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const MarketingHero = () => {
  return (
    <section className="px-4 py-24 md:py-32 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          Interview with clarity.
          <br />
          <span className="text-primary">Pay only when hiring happens.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          FuturHire helps hiring teams run structured, calm, and fair interviews — without paying for resumes, seats, or noise.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="text-base px-8">
            <Link to="/contact">Start a pilot</Link>
          </Button>
          
          <Button asChild variant="ghost" size="lg" className="text-base text-muted-foreground hover:text-foreground">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </div>
    </section>
  );
};