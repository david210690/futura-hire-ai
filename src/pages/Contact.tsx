import { SEOHead } from "@/components/shared/SEOHead";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Mail, MapPin } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Contact Us | FuturaHire"
        description="Contact FuturaHire - Get in touch with our team."
      />
      <LandingNav />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-8">Contact FuturaHire</h1>
        
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Email</h2>
              <a 
                href="mailto:hello@futurahire.app" 
                className="text-primary hover:underline text-lg"
              >
                hello@futurahire.app
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Address</h2>
              <p className="text-muted-foreground">
                KSuiteLabs OPC Private Limited<br />
                120, Maurya Vihar Colony,<br />
                Transport Nagar, Kumhrar,<br />
                Patna-26, Bihar, India
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default Contact;
