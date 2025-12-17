import { SEOHead } from "@/components/shared/SEOHead";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { OutcomesDifferentiator } from "@/components/marketing/OutcomesDifferentiator";
import { KeyFeatures } from "@/components/marketing/KeyFeatures";
import { CandidateTrust } from "@/components/marketing/CandidateTrust";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { PricingPhilosophy } from "@/components/marketing/PricingPhilosophy";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const MarketingLanding = () => {
  return (
    <>
      <SEOHead
        title="FuturHire — Interview with clarity. Pay only when hiring happens."
        description="FuturHire helps hiring teams run structured, calm, and fair interviews — without paying for resumes, seats, or noise."
      />
      <main className="min-h-screen bg-background text-foreground">
        <MarketingHero />
        <ProblemSection />
        <OutcomesDifferentiator />
        <KeyFeatures />
        <CandidateTrust />
        <HowItWorksSection />
        <PricingPhilosophy />
        <FinalCTA />
        <MarketingFooter />
      </main>
    </>
  );
};

export default MarketingLanding;
