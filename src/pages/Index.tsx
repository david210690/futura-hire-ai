import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateOrgModal } from "@/components/org/CreateOrgModal";

const Index = () => {
  const navigate = useNavigate();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }

        // Get user role first
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // If candidate, go directly to candidate dashboard
        if (userRole?.role === 'candidate') {
          navigate('/candidate/dashboard');
          return;
        }

        // For recruiters, check if they have an org
        const { data: memberships, error: memberError } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', session.user.id);

        if (memberError) {
          console.error('Error checking memberships:', memberError);
          setChecking(false);
          setShowCreateOrg(true);
          return;
        }

        if (!memberships || memberships.length === 0) {
          // No org, show create modal for recruiters
          setChecking(false);
          setShowCreateOrg(true);
          return;
        }

        // Has org, redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Error in checkAuth:', error);
        setChecking(false);
        setShowCreateOrg(true);
      }
    };

    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          {/* Animated spinner */}
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          
          {/* Brand and message */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">FuturaHire</h2>
            <p className="text-muted-foreground">Preparing your workspace</p>
          </div>
          
          {/* Animated dots */}
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to FuturaHire</h1>
          <p className="text-muted-foreground">Setting up your organization...</p>
        </div>
      </div>
      <CreateOrgModal 
        open={showCreateOrg} 
        onOpenChange={setShowCreateOrg}
      />
    </>
  );
};

export default Index;
