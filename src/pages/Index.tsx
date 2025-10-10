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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user has any orgs
      const { data: orgs } = await supabase
        .from('org_members')
        .select('org_id, orgs(*)')
        .eq('user_id', session.user.id);

      if (!orgs || orgs.length === 0) {
        // No org, show create modal
        setChecking(false);
        setShowCreateOrg(true);
        return;
      }

      // Has org, redirect based on role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (userRole?.role === 'recruiter') {
        navigate('/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    };

    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
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
