import { Link } from "react-router-dom";
import futurahireLogo from "@/assets/futurahire-logo.png";

export const LandingFooter = () => {
  return (
    <footer className="px-4 py-12 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={futurahireLogo} alt="FuturaHire" className="h-6" />
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:hello@futurahire.app" className="hover:text-foreground transition-colors">
              hello@futurahire.app
            </a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">
              Refund Policy
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FuturaHire. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
