import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAndLockExpiredPilot, getOrgPilotStatus, type OrgPilotStatus } from "@/lib/pilot";
import { SHOW_PRICING } from "@/lib/billing-config";

interface UsePilotGuardResult {
  status: OrgPilotStatus | null;
  loading: boolean;
  isLocked: boolean;
  isPilot: boolean;
  isActive: boolean;
}

/**
 * Hook to guard routes based on pilot/subscription status
 * Redirects to /billing if org is locked
 */
export function usePilotGuard(orgId: string | undefined, options?: { 
  redirectOnLock?: boolean;
  allowedWhenLocked?: boolean;
}): UsePilotGuardResult {
  const [status, setStatus] = useState<OrgPilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const { redirectOnLock = true, allowedWhenLocked = false } = options || {};

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      setLoading(true);

      // While pricing is disabled, never lock or redirect anyone
      if (!SHOW_PRICING) {
        const pilotStatus = await getOrgPilotStatus(orgId);
        setStatus(pilotStatus);
        setLoading(false);
        return;
      }

      // Check and lock if expired
      await checkAndLockExpiredPilot(orgId);
      
      const pilotStatus = await getOrgPilotStatus(orgId);
      setStatus(pilotStatus);
      
      // Redirect to billing if locked and not on an allowed route
      if (pilotStatus?.planStatus === 'locked' && redirectOnLock && !allowedWhenLocked) {
        navigate('/billing', { replace: true });
      }
      
      setLoading(false);
    };


    checkStatus();
  }, [orgId, navigate, redirectOnLock, allowedWhenLocked]);

  return {
    status,
    loading,
    isLocked: status?.planStatus === 'locked',
    isPilot: status?.planStatus === 'pilot',
    isActive: status?.planStatus === 'active',
  };
}
