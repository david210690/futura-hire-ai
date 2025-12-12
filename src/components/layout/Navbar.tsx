import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Sparkles, 
  LogOut, 
  Briefcase, 
  LayoutDashboard, 
  DollarSign,
  Users,
  FileText,
  ClipboardList,
  Radar,
  TrendingUp,
  Mic,
  User,
  Video,
  Bot,
  Menu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrgSwitcher } from "@/components/org/OrgSwitcher";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

const recruiterNavItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Role Designer", path: "/role-designer", icon: Briefcase },
  { label: "Assessments", path: "/assessments", icon: ClipboardList },
  { label: "Pricing", path: "/pricing", icon: DollarSign },
];

const candidateNavItems = [
  { label: "Dashboard", path: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "My Profile", path: "/candidate/profile", icon: User },
  { label: "AI Job Twin", path: "/job-twin", icon: Bot },
  { label: "Opportunity Radar", path: "/opportunity-radar", icon: Radar },
  { label: "Career Trajectory", path: "/career-trajectory", icon: TrendingUp },
  { label: "Interview Practice", path: "/interview-practice", icon: Mic },
  { label: "Voice Interviews", path: "/voice-interview", icon: Video },
];

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

  const navItems = userRole === 'recruiter' ? recruiterNavItems : candidateNavItems;
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate(userRole === 'recruiter' ? '/dashboard' : '/candidate/dashboard')}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:inline">
              FuturaHire
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className="gap-2"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>
                  {userRole === 'recruiter' ? 'Recruiter Menu' : 'Candidate Menu'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 cursor-pointer",
                      isActive(item.path) && "bg-secondary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {currentOrg && (
            <span className="text-sm text-muted-foreground hidden md:inline">
              {currentOrg.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {userRole === 'recruiter' && <OrgSwitcher />}
          {userName && (
            <div className="hidden sm:flex flex-col items-end">
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
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
