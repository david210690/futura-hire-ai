import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Org {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'recruiter' | 'viewer';
  created_at: string;
}

export const useCurrentOrg = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrgs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get all org memberships
      const { data: memberships, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error loading memberships:', memberError);
        setLoading(false);
        return;
      }

      if (memberships && memberships.length > 0) {
        // Get org details separately
        const orgIds = memberships.map(m => m.org_id);
        const { data: orgsData, error: orgsError } = await supabase
          .from('orgs')
          .select('*')
          .in('id', orgIds);

        if (orgsError) {
          console.error('Error loading orgs:', orgsError);
          setLoading(false);
          return;
        }

        setOrgs(orgsData || []);

        // Get stored org preference or use first org
        const storedOrgId = localStorage.getItem('currentOrgId');
        const selectedOrg = storedOrgId 
          ? orgsData?.find(o => o.id === storedOrgId) || orgsData?.[0]
          : orgsData?.[0];

        if (selectedOrg) {
          setCurrentOrg(selectedOrg);
          const membership = memberships.find(m => m.org_id === selectedOrg.id);
          setCurrentRole(membership?.role || null);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in loadOrgs:', error);
      setLoading(false);
    }
  };

  const switchOrg = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', orgId);
      window.location.reload(); // Refresh to update all queries
    }
  };

  useEffect(() => {
    loadOrgs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadOrgs();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    orgs, 
    currentOrg, 
    currentRole,
    loading, 
    switchOrg,
    refreshOrgs: loadOrgs,
    isAdmin: currentRole === 'owner' || currentRole === 'admin',
    isOwner: currentRole === 'owner'
  };
};
