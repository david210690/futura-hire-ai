import { Link } from "react-router-dom";

export const LandingFooter = () => {
  return (
    <footer className="px-4 py-12 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">FuturaHire</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:sales@feelivacation.com" className="hover:text-foreground transition-colors">
              sales@feelivacation.com
            </a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
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
