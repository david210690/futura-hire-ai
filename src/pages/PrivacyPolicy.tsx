import { SEOHead } from "@/components/shared/SEOHead";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Privacy Policy | FuturaHire"
        description="FuturaHire Privacy Policy - Learn how we collect, use, and protect your information."
      />
      <LandingNav />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: 10-10-2025</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            FuturaHire ("we", "our", "us") is operated by KSuiteLabs OPC Private Limited ("Company", "Parent Company"), 
            located at 120, Maurya Vihar Colony, Transport Nagar, Kumhrar, Patna-26, Bihar, India. 
            If you have questions, contact <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">We may collect:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account information:</strong> name, email, phone number, role (recruiter/candidate), company details (for recruiter accounts).</li>
              <li><strong>Usage data:</strong> pages visited, actions taken, device/browser information, IP address (for security and analytics).</li>
              <li><strong>Recruitment workflow data:</strong> job postings, candidate stage movement, interview kit usage, notes added by authorized users.</li>
              <li><strong>Candidate practice data:</strong> warm-up responses, practice reflections, and (if enabled) voice practice summaries/signals.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Information</h2>
            <p className="text-muted-foreground mb-4">We use information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide and maintain the FuturaHire platform.</li>
              <li>Improve interview preparation and structured hiring workflows.</li>
              <li>Support customer service, onboarding, and communications.</li>
              <li>Maintain security, prevent fraud, and comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Practice & Voice Sessions (Important)</h2>
            <p className="text-muted-foreground mb-4">
              FuturaHire is designed to be supportive and ND-safe. We aim to store structured, high-level reflections/signals rather than sensitive raw data.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Recruiters generally see summary signals where applicable.</li>
              <li>Candidates may see their own reflections and practice history.</li>
              <li>We do not use practice data to auto-reject candidates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Sharing of Information</h2>
            <p className="text-muted-foreground mb-4">We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Service providers who help us operate the platform (hosting, analytics, email, customer support).</li>
              <li>Payment processors (e.g., Razorpay) for billing and compliance.</li>
              <li>Legal authorities when required by law.</li>
            </ul>
            <p className="text-muted-foreground mt-4 font-medium">We do not sell personal data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground mb-4">We retain information only as long as needed for:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>providing services,</li>
              <li>legal compliance,</li>
              <li>resolving disputes,</li>
              <li>enforcing agreements.</li>
            </ul>
            <p className="text-muted-foreground mt-4">You may request deletion subject to legal and operational limits.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Security</h2>
            <p className="text-muted-foreground">
              We use reasonable administrative and technical safeguards to protect your information. 
              No system is 100% secure; you use the service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground mb-4">Depending on applicable law, you may request:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>access, correction, or deletion of personal data,</li>
              <li>withdrawal of consent (where applicable),</li>
              <li>information about how your data is used.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Contact <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. International Users</h2>
            <p className="text-muted-foreground">
              If you access FuturaHire from outside India, your information may be processed in jurisdictions where our service providers operate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Updates</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Continued use of FuturaHire means you accept the updated policy.
            </p>
          </section>

          <section className="border-t border-border pt-8 mt-8">
            <p className="text-muted-foreground">
              <strong>Contact:</strong> <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Company:</strong> KSuiteLabs OPC Private Limited, 120, Maurya Vihar Colony, Transport Nagar, Kumhrar, Patna-26, Bihar, India
            </p>
          </section>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default PrivacyPolicy;
