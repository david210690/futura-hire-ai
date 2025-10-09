import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, LogOut, Briefcase, LayoutDashboard, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrgSwitcher } from "@/components/org/OrgSwitcher";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

export const Navbar = ({ userName, userRole }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      navigate('/auth');
    }
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              FuturaHire
            </span>
          </div>
          
          {userRole === 'recruiter' && (
            <nav className="flex items-center gap-1">
              <Button
                variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant={location.pathname === '/role-designer' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/role-designer')}
                className="gap-2"
              >
                <Briefcase className="w-4 h-4" />
                Role Designer
              </Button>
            </nav>
          )}
          
          {currentOrg && (
            <span className="text-sm text-muted-foreground">
              {currentOrg.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <OrgSwitcher />
          {userName && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};
