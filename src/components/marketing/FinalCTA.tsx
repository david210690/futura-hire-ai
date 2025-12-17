import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const FinalCTA = () => {
  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 leading-tight">
          Run better interviews.
          <br />
          Without paying for noise.
        </h2>
        
        <Button asChild size="lg" className="text-base px-8 mb-4">
          <Link to="/contact">Start a pilot</Link>
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Talk to us before committing.
        </p>
      </div>
    </section>
  );
};
