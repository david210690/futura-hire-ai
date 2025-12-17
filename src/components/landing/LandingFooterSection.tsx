import { Link } from "react-router-dom";

export const LandingFooterSection = () => {
  return (
    <footer className="px-4 py-12 bg-muted/50 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="font-semibold text-foreground mb-1">FuturHire</p>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FuturHire. Operated by KSuiteLabs OPC Private Limited.
            </p>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <a 
              href="mailto:hello@futurahire.app" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <Link 
              to="/privacy-policy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link 
              to="/terms-and-conditions" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link 
              to="/refund-policy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
