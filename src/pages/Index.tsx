import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateOrgModal } from "@/components/org/CreateOrgModal";
import { RoleSelectionModal } from "@/components/auth/RoleSelectionModal";

const Index = () => {
  const navigate = useNavigate();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }

        setUserId(session.user.id);

        // Get user role first
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // If no role or default candidate from OAuth, check if they need role selection
        // We detect OAuth users by checking if they have Google provider
        const provider = session.user.app_metadata?.provider;
        const isOAuthUser = provider === 'google';
        
        // Check if user was just created (within last 5 minutes) via OAuth
        const createdAt = new Date(session.user.created_at);
        const now = new Date();
        const isNewUser = (now.getTime() - createdAt.getTime()) < 5 * 60 * 1000; // 5 minutes
        
        // Show role selection for new OAuth users who got default 'candidate' role
        if (isOAuthUser && isNewUser && userRole?.role === 'candidate') {
          setChecking(false);
          setShowRoleSelection(true);
          return;
        }

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

  const handleRoleSelected = (role: 'recruiter' | 'candidate') => {
    setShowRoleSelection(false);
    if (role === 'candidate') {
      navigate('/candidate/dashboard');
    } else {
      // Recruiter needs to create org
      setShowCreateOrg(true);
    }
  };

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
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
      
      {showRoleSelection && userId && (
        <RoleSelectionModal 
          userId={userId}
          onRoleSelected={handleRoleSelected}
        />
      )}
      
      <CreateOrgModal 
        open={showCreateOrg} 
        onOpenChange={setShowCreateOrg}
      />
    </>
  );
};

export default Index;
