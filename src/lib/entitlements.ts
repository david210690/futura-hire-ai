import { supabase } from "@/integrations/supabase/client";

export interface EntitlementCheck {
  enabled: boolean;
  value?: string;
}

export interface UsageCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

// Import billing config from separate file
export { BILLING_CONFIG, isDemoMode, isBillingConfigured } from './billing-config';

// Default demo entitlements when billing is disabled
export const DEMO_ENTITLEMENTS = {
  plan: 'team',
  features: {
    copilot: true,
    predictive: true,
    gamification: true,
    assessments: true,
    culture_dna: true,
    video_summary: true,
    marketing_assets: true,
    role_designer: true,
    retention: true,
    team_optimizer: true,
    share_shortlist: true,
  },
  limits: {
    ai_shortlist_per_day: 100,
    video_analysis_per_day: 50,
    coach_runs_per_day: 50,
    bias_runs_per_day: 50,
    marketing_runs_per_day: 50,
    copilot_per_day: 100,
  },
};

/**
 * Check if an org has a specific feature entitlement
 */
export async function checkEntitlement(
  orgId: string,
  feature: string
): Promise<EntitlementCheck> {
  const { data, error } = await supabase.rpc('get_entitlement', {
    _org_id: orgId,
    _feature: feature,
  });

  if (error) {
    console.error('Error checking entitlement:', error);
    return { enabled: false };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { enabled: false };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return { enabled: result?.enabled || false, value: result?.value };
}

/**
 * Check usage quota and increment if allowed
 */
export async function checkAndIncrementUsage(
  orgId: string,
  metric: string
): Promise<UsageCheck> {
  const { data, error } = await supabase.rpc('increment_usage', {
    _org_id: orgId,
    _metric: metric,
  });

  if (error) {
    console.error('Error checking usage:', error);
    return { allowed: false, remaining: 0, limit: 0 };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const remaining = result?.remaining || 0;
  const limit = result?.limit_value || 0;
  
  return {
    allowed: remaining >= 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}

/**
 * Get current usage without incrementing
 */
export async function getCurrentUsage(
  orgId: string,
  metric: string,
  day?: Date
): Promise<number> {
  const { data, error } = await supabase.rpc('get_usage', {
    _org_id: orgId,
    _metric: metric,
    _day: day?.toISOString().split('T')[0],
  });

  if (error) {
    console.error('Error getting usage:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Grant demo entitlements to an org (when billing is disabled)
 */
export async function grantDemoEntitlements(orgId: string) {
  const features = [
    { feature: 'feature_copilot', enabled: true },
    { feature: 'feature_predictive', enabled: true },
    { feature: 'feature_gamification', enabled: true },
    { feature: 'feature_assessments', enabled: true },
    { feature: 'feature_culture_dna', enabled: true },
    { feature: 'feature_video_summary', enabled: true },
    { feature: 'feature_marketing_assets', enabled: true },
    { feature: 'feature_role_designer', enabled: true },
    { feature: 'feature_retention', enabled: true },
    { feature: 'feature_team_optimizer', enabled: true },
    { feature: 'feature_share_shortlist', enabled: true },
    { feature: 'limits_ai_shortlist_per_day', enabled: true, value: '100' },
    { feature: 'limits_video_analysis_per_day', enabled: true, value: '50' },
    { feature: 'limits_coach_runs_per_day', enabled: true, value: '50' },
    { feature: 'limits_bias_runs_per_day', enabled: true, value: '50' },
    { feature: 'limits_marketing_runs_per_day', enabled: true, value: '50' },
    { feature: 'limits_copilot_per_day', enabled: true, value: '100' },
  ];

  const { error } = await supabase
    .from('entitlements')
    .upsert(
      features.map(f => ({
        org_id: orgId,
        feature: f.feature,
        enabled: f.enabled,
        value: f.value || null,
      })),
      { onConflict: 'org_id,feature' }
    );

  if (error) {
    console.error('Error granting demo entitlements:', error);
    throw error;
  }
}
