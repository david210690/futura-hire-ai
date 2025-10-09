import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Org {
  id: string;
  name: string;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get all orgs user is member of
    const { data: memberships } = await supabase
      .from('org_members')
      .select('org_id, role, orgs(*)')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const userOrgs = memberships.map(m => m.orgs).filter(Boolean) as Org[];
      setOrgs(userOrgs);

      // Get stored org preference or use first org
      const storedOrgId = localStorage.getItem('currentOrgId');
      const selectedOrg = storedOrgId 
        ? userOrgs.find(o => o.id === storedOrgId) || userOrgs[0]
        : userOrgs[0];

      setCurrentOrg(selectedOrg);
      const membership = memberships.find(m => m.org_id === selectedOrg.id);
      setCurrentRole(membership?.role || null);
    }

    setLoading(false);
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
