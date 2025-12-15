import { SEOHead } from "@/components/shared/SEOHead";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Terms and Conditions | FuturaHire"
        description="FuturaHire Terms and Conditions - Read our terms of service."
      />
      <LandingNav />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Effective Date: 10-10-2025</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            These Terms govern your use of FuturaHire (the "Service"). The Service is operated by KSuiteLabs OPC Private Limited 
            ("Company", "Parent Company"), 120, Maurya Vihar Colony, Transport Nagar, Kumhrar, Patna-26, Bihar, India. 
            Contact: <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using FuturaHire, you agree to these Terms and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Accounts and Eligibility</h2>
            <p className="text-muted-foreground">
              You must provide accurate information and keep your credentials secure. You are responsible for activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Service Description</h2>
            <p className="text-muted-foreground mb-4">
              FuturaHire provides tools for structured hiring workflows, interview preparation, interview kits, and optional practice experiences for candidates.
            </p>
            <p className="text-muted-foreground font-medium">
              Important: FuturaHire provides guidance and structure, not hiring decisions. Recruiters/companies remain solely responsible for hiring decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Candidate Practice & Voice Sessions</h2>
            <p className="text-muted-foreground">
              Candidate practice, including voice practice (if available), is intended for preparation and reflection only. 
              We do not guarantee outcomes, job offers, or hiring success.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Subscription, Billing, and Taxes</h2>
            <p className="text-muted-foreground">
              If you purchase a paid plan, you agree to pay applicable fees and taxes as listed at checkout or invoice. 
              We may update prices or plan features with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Outcome-Based Counting (If Applicable)</h2>
            <p className="text-muted-foreground">
              If your plan includes usage limits based on "hires" or similar metrics, the meaning of such terms will be defined in your plan/invoice 
              or your organization's admin settings. Typically, a "hire" means an offer accepted and confirmed in the system by an authorized user.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>violate any law,</li>
              <li>attempt unauthorized access,</li>
              <li>upload malicious code,</li>
              <li>harass or discriminate,</li>
              <li>misuse candidate data or use it for unlawful profiling.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              FuturaHire and its content, branding, and software are owned by the Company or its licensors. 
              You receive a limited, non-transferable right to use the Service while your account is active.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you submit. You grant FuturaHire the rights needed to process and display that content to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Third-Party Services</h2>
            <p className="text-muted-foreground">
              We may integrate with third-party services (e.g., payment processors, communications providers). Their terms may apply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Disclaimers</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" and "as available." We do not warrant that the Service will be uninterrupted or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, the Company will not be liable for indirect, incidental, or consequential damages, 
              or loss of profits/data, arising from use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate access if you violate these Terms or if required by law. You may stop using FuturaHire at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Governing Law and Jurisdiction</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of India. Courts with jurisdiction in Patna, Bihar will have exclusive jurisdiction, subject to applicable law.
            </p>
          </section>

          <section className="border-t border-border pt-8 mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact</h2>
            <p className="text-muted-foreground">
              <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>
            </p>
            <p className="text-muted-foreground mt-2">
              KSuiteLabs OPC Private Limited<br />
              120, Maurya Vihar Colony, Transport Nagar, Kumhrar, Patna-26, Bihar, India
            </p>
          </section>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default TermsAndConditions;
