import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Refund = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: December 2024</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Subscription Refunds</h2>
            <p className="text-muted-foreground">
              We offer a 7-day money-back guarantee for all new subscriptions. If you're not satisfied 
              with our service within the first 7 days, contact us for a full refund.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Eligibility</h2>
            <p className="text-muted-foreground">
              To be eligible for a refund, you must request it within 7 days of your initial purchase. 
              Refund requests made after this period will be reviewed on a case-by-case basis.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How to Request a Refund</h2>
            <p className="text-muted-foreground">
              To request a refund, please email us at{" "}
              <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">
                hello@futurahire.app
              </a>{" "}
              with your account email and reason for the refund request.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Processing Time</h2>
            <p className="text-muted-foreground">
              Approved refunds will be processed within 5-10 business days. The refund will be credited 
              to the original payment method used for the purchase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Non-Refundable Items</h2>
            <p className="text-muted-foreground">
              One-time purchases, such as individual assessment credits or add-on features, are 
              generally non-refundable unless there's a technical issue preventing their use.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about our Refund Policy, please contact us at{" "}
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

export default Refund;
