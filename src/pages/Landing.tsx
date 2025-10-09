import { HeroSection } from "@/components/landing/HeroSection";
import { WhyFuturaHire } from "@/components/landing/WhyFuturaHire";
import { AssessmentSuite } from "@/components/landing/AssessmentSuite";
import { VideoStandards } from "@/components/landing/VideoStandards";
import { CopilotDemo } from "@/components/landing/CopilotDemo";
import { ModulesCarousel } from "@/components/landing/ModulesCarousel";
import { Testimonials } from "@/components/landing/Testimonials";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { CopilotAvatar } from "@/components/landing/CopilotAvatar";

const Landing = () => {
  return (
    <main className="min-h-screen bg-background dark overflow-x-hidden">
      <HeroSection />
      <WhyFuturaHire />
      <AssessmentSuite />
      <VideoStandards />
      <CopilotDemo />
      <ModulesCarousel />
      <Testimonials />
      <PricingSection />
      <FinalCTA />
      <CopilotAvatar />
    </main>
  );
};

export default Landing;
