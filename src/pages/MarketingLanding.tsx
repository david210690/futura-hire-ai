import { useRef } from "react";
import { SEOHead } from "@/components/shared/SEOHead";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { BetaAccessBanner } from "@/components/landing/FoundingPartnerBanner";
import { WhatYouGetSection } from "@/components/landing/WhatYouGetSection";
import { HowItWorksLanding } from "@/components/landing/HowItWorksLanding";
import { ForRecruitersAndCandidates } from "@/components/landing/ForRecruitersAndCandidates";
import { LandingPricingSection } from "@/components/landing/LandingPricingSection";
import { TrustFairnessSection } from "@/components/landing/TrustFairnessSection";
import { LandingFAQSection } from "@/components/landing/LandingFAQSection";
import { PilotLeadForm } from "@/components/landing/PilotLeadForm";
import { LandingFooterSection } from "@/components/landing/LandingFooterSection";

const MarketingLanding = () => {
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEOHead
        title="FuturHire — Hiring clarity without the ATS chaos"
        description="FuturHire helps teams run consistent, fair interviews using Role DNA, structured question kits, and explainable decision rooms. Free for candidates."
      />
      <main className="min-h-screen bg-background text-foreground">
        <LandingHeroSection onApplyPilot={scrollToForm} />
        <BetaAccessBanner onApplyPilot={scrollToForm} />
        <WhatYouGetSection />
        <HowItWorksLanding />
        <ForRecruitersAndCandidates />
        <LandingPricingSection onApplyPilot={scrollToForm} />
        <TrustFairnessSection />
        <LandingFAQSection />
        <PilotLeadForm ref={formRef} />
        <LandingFooterSection />
      </main>
    </>
  );
};

export default MarketingLanding;
