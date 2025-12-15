import { SEOHead } from "@/components/shared/SEOHead";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Cancellation & Refund Policy | FuturaHire"
        description="FuturaHire Cancellation & Refund Policy - Learn about our subscription and refund terms."
      />
      <LandingNav />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Cancellation & Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: 10-10-2025</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            This Cancellation & Refund Policy applies to FuturaHire, operated by KSuiteLabs OPC Private Limited, 
            120, Maurya Vihar Colony, Transport Nagar, Kumhrar, Patna-26, Bihar, India. 
            Contact: <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Subscriptions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may cancel your subscription renewal at any time from your account (where available) or by emailing us.</li>
              <li>Cancellation stops future renewals. Access generally continues until the end of the current billing period unless stated otherwise.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Refunds</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Unless required by law, subscription fees are non-refundable once the billing period has started.</li>
              <li>
                If you were charged in error or experienced a verified billing issue, 
                contact <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a> within 7 days of the charge and we will review.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Pilot / Beta Access Programs</h2>
            <p className="text-muted-foreground">
              Pilot access terms and any conversion pricing are governed by the pilot agreement or written confirmation shared during onboarding.
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

export default RefundPolicy;
