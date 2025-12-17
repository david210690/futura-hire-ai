import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const PilotCTA = () => {
  return (
    <section id="pilot" className="px-4 py-20 md:py-28">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Start with a Growth pilot
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          We onboard pilot companies on our Growth plan so you can experience FuturHire fully.
        </p>
        
        <Button asChild size="lg" className="text-base px-8 mb-4">
          <Link to="/contact">Request pilot access</Link>
        </Button>
        
        <p className="text-sm text-muted-foreground">
          No payment during pilot. Continue only if it delivers value.
        </p>
      </div>
    </section>
  );
};
