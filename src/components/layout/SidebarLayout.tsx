import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OrgSwitcher } from "@/components/org/OrgSwitcher";

interface SidebarLayoutProps {
  children: ReactNode;
  userRole: "recruiter" | "candidate";
  userName?: string;
  orgName?: string;
}

export function SidebarLayout({ children, userRole, userName, orgName }: SidebarLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <SidebarProvider defaultOpen={true}>
      <AppSidebar userRole={userRole} userName={userName} orgName={orgName} />
      <SidebarInset>
        {/* Top header bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘B</kbd> to toggle
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {userRole === 'recruiter' && <OrgSwitcher />}
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
        </header>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
