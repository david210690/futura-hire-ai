import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

interface FoundingPartnerBannerProps {
  onApplyPilot: () => void;
}

export const FoundingPartnerBanner = ({ onApplyPilot }: FoundingPartnerBannerProps) => {
  return (
    <section className="px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-8 md:p-12">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wide">
                Limited Availability
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Founding Partner Program — Pilot Companies Only
            </h2>
            
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
              First 50 teams get up to 3 months of pilot access. Convert within 14 days 
              of pilot completion to unlock Founding Partner pricing for 12 months.
            </p>
            
            
            <Button onClick={onApplyPilot} size="lg" className="px-8">
              Apply for Pilot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
