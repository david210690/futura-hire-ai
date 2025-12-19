import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import futurahireLogo from "@/assets/futurahire-logo.png";

export const LandingNavbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={futurahireLogo} alt="FuturaHire" className="h-10" />
        </Link>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/auth')}
          >
            Sign Up
          </Button>
        </div>
      </div>
    </nav>
  );
};
