import { SEOHead } from "@/components/shared/SEOHead";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Shipping Policy | FuturaHire"
        description="FuturaHire Shipping Policy - Digital delivery information."
      />
      <LandingNav />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Shipping Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: 10-10-2025</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            FuturaHire is a digital service operated by KSuiteLabs OPC Private Limited.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Digital Delivery</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Upon successful payment and account verification (if applicable), your subscription access is provided digitally through your FuturaHire account.</li>
              <li>No physical items are shipped.</li>
              <li>
                For access issues, contact <a href="mailto:hello@futurahire.app" className="text-primary hover:underline">hello@futurahire.app</a>.
              </li>
            </ul>
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

export default ShippingPolicy;
