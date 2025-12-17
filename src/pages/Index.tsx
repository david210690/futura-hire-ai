import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateOrgModal } from "@/components/org/CreateOrgModal";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
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
    return <LoadingSpinner message="Preparing your workspace" fullScreen />;
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
