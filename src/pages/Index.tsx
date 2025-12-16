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

        // Check if OAuth user
        const provider = session.user.app_metadata?.provider;
        const isOAuthUser = provider === 'google';
        
        // For OAuth users with default 'candidate' role, check if they've completed onboarding
        if (isOAuthUser && userRole?.role === 'candidate') {
          // Check if user has a candidate profile (means they completed candidate onboarding)
          const { data: candidateProfile } = await supabase
            .from('candidates')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          // Check if user has org memberships (means they completed recruiter onboarding)
          const { data: orgMembership } = await supabase
            .from('org_members')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          // If no profile and no org membership, they haven't selected a role yet
          if (!candidateProfile && !orgMembership) {
            setChecking(false);
            setShowRoleSelection(true);
            return;
          }
        }

        // If candidate with profile, go to candidate dashboard
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
      // New candidates go through onboarding flow
      navigate('/candidate/welcome');
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
