import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: December 2024</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using FuturaHire, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              FuturaHire provides an AI-powered hiring platform that connects candidates with employers. 
              Our services include job matching, video interviews, assessments, and career coaching tools.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account. You must provide accurate and complete 
              information when creating an account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. User Conduct</h2>
            <p className="text-muted-foreground">
              You agree not to use the service to submit false information, harass others, or engage 
              in any activity that violates applicable laws or regulations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of FuturaHire are owned by us and are protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              FuturaHire shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages arising from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">
                hello@futurahire.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Terms;
