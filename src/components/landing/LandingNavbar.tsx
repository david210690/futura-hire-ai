import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const LandingNavbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FuturaHire
          </span>
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
