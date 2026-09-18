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

type OrgCache = {
  userId: string;
  orgs: Org[];
  memberships: Array<Pick<OrgMember, 'org_id' | 'role'>>;
};

let orgCache: OrgCache | null = null;
let orgLoadPromise: Promise<OrgCache | null> | null = null;

const fetchOrgData = async (userId: string): Promise<OrgCache | null> => {
  const { data: memberships, error: memberError } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId);

  if (memberError) throw memberError;
  if (!memberships || memberships.length === 0) {
    return { userId, orgs: [], memberships: [] };
  }

  const { data: orgsData, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name, slug, owner_id, created_at')
    .in('id', memberships.map(membership => membership.org_id));

  if (orgsError) throw orgsError;
  return { userId, orgs: orgsData || [], memberships };
};

export const useCurrentOrg = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrgs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      if (!orgCache || orgCache.userId !== userId) {
        if (!orgLoadPromise) {
          orgLoadPromise = fetchOrgData(userId).finally(() => {
            orgLoadPromise = null;
          });
        }
        orgCache = await orgLoadPromise;
      }

      if (orgCache) {
        setOrgs(orgCache.orgs);
        const storedOrgId = localStorage.getItem('currentOrgId');
        const selectedOrg = storedOrgId
          ? orgCache.orgs.find(org => org.id === storedOrgId) || orgCache.orgs[0]
          : orgCache.orgs[0];

        setCurrentOrg(selectedOrg || null);
        setCurrentRole(
          orgCache.memberships.find(membership => membership.org_id === selectedOrg?.id)?.role || null,
        );
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in loadOrgs:', error);
      orgCache = null;
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
