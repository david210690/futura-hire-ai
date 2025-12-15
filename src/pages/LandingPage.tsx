import { useRef } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { BetaAccessBanner } from "@/components/landing/FoundingPartnerBanner";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ForRecruitersAndCandidates } from "@/components/landing/ForRecruitersAndCandidates";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { TrustSection } from "@/components/landing/TrustSection";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { PilotLeadForm } from "@/components/landing/PilotLeadForm";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SEOHead } from "@/components/shared/SEOHead";

const LandingPage = () => {
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
      <main className="min-h-screen bg-background">
        <LandingNav onApplyPilot={scrollToForm} />
        
        <div className="pt-16">
          <LandingHero onApplyPilot={scrollToForm} />
          <BetaAccessBanner onApplyPilot={scrollToForm} />
          <div id="features">
            <WhatYouGet />
          </div>
          <HowItWorks />
          <ForRecruitersAndCandidates />
          <div id="pricing">
            <LandingPricing onApplyPilot={scrollToForm} />
          </div>
          <TrustSection />
          <div id="faq">
            <LandingFAQ />
          </div>
          <PilotLeadForm ref={formRef} />
          <LandingFooter />
        </div>
      </main>
    </>
  );
};

export default LandingPage;
