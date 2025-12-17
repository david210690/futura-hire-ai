import { SEOHead } from "@/components/shared/SEOHead";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { DifferentiatorSection } from "@/components/marketing/DifferentiatorSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { PricingPhilosophy } from "@/components/marketing/PricingPhilosophy";
import { WhoItsFor } from "@/components/marketing/WhoItsFor";
import { PilotCTA } from "@/components/marketing/PilotCTA";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const MarketingLanding = () => {
  return (
    <>
      <SEOHead
        title="FuturHire — Pay for outcomes, not pipeline noise"
        description="FuturHire is interview intelligence that charges only when an offer is accepted. No resume fees. No seat costs. Just outcomes."
      />
      <main className="min-h-screen bg-background text-foreground">
        <MarketingHero />
        <ProblemSection />
        <DifferentiatorSection />
        <HowItWorksSection />
        <PricingPhilosophy />
        <WhoItsFor />
        <PilotCTA />
        <MarketingFooter />
      </main>
    </>
  );
};

export default MarketingLanding;
