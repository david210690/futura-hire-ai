import { supabase } from "@/integrations/supabase/client";

// Pilot deadline: 31 March 2026, 23:59:59 IST (Asia/Kolkata)
export const PILOT_END_DATE = new Date('2026-03-31T23:59:59+05:30');

export type PlanStatus = 'pilot' | 'active' | 'locked';
export type PlanTier = 'growth' | 'starter' | 'scale';

export interface OrgPilotStatus {
  planTier: PlanTier;
  planStatus: PlanStatus;
  pilotStartAt: string | null;
  pilotEndAt: string | null;
  convertedAt: string | null;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
}

/**
 * Get pilot status for an organization
 */
export async function getOrgPilotStatus(orgId: string): Promise<OrgPilotStatus | null> {
  const { data, error } = await supabase
    .from('orgs')
    .select('plan_tier, plan_status, pilot_start_at, pilot_end_at, converted_at')
    .eq('id', orgId)
    .single();

  if (error || !data) {
    console.error('Error fetching org pilot status:', error);
    return null;
  }

  const now = new Date();
  const endDate = data.pilot_end_at ? new Date(data.pilot_end_at) : PILOT_END_DATE;
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const isExpired = now >= endDate;

  return {
    planTier: data.plan_tier as PlanTier,
    planStatus: data.plan_status as PlanStatus,
    pilotStartAt: data.pilot_start_at,
    pilotEndAt: data.pilot_end_at,
    convertedAt: data.converted_at,
    daysRemaining,
    hoursRemaining,
    isExpired,
  };
}

/**
 * Activate Growth pilot for an organization
 */
export async function activateGrowthPilot(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('orgs')
    .update({
      plan_tier: 'growth',
      plan_status: 'pilot',
      pilot_start_at: now,
      pilot_end_at: PILOT_END_DATE.toISOString(),
    })
    .eq('id', orgId);

  if (error) {
    console.error('Error activating Growth pilot:', error);
    throw error;
  }

  // Apply Growth plan entitlements
  await applyGrowthEntitlements(orgId);
}

/**
 * Apply Growth plan entitlements to an organization
 */
export async function applyGrowthEntitlements(orgId: string): Promise<void> {
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
    { feature: 'feature_role_dna', enabled: true },
    { feature: 'feature_interview_kits', enabled: true },
    { feature: 'feature_decision_room', enabled: true },
    { feature: 'feature_question_bank_admin', enabled: true },
    { feature: 'feature_hiring_autopilot', enabled: true },
    { feature: 'limits_ai_shortlist_per_day', enabled: true, value: '50' },
    { feature: 'limits_video_analysis_per_day', enabled: true, value: '25' },
    { feature: 'limits_coach_runs_per_day', enabled: true, value: '25' },
    { feature: 'limits_bias_runs_per_day', enabled: true, value: '25' },
    { feature: 'limits_marketing_runs_per_day', enabled: true, value: '25' },
    { feature: 'limits_copilot_per_day', enabled: true, value: '100' },
    { feature: 'limits_hires_per_year', enabled: true, value: '25' },
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
    console.error('Error applying Growth entitlements:', error);
    throw error;
  }
}

/**
 * Check if pilot has expired and lock org if needed
 */
export async function checkAndLockExpiredPilot(orgId: string): Promise<boolean> {
  const status = await getOrgPilotStatus(orgId);
  
  if (!status) return false;
  
  // If already active (paid) or already locked, no action needed
  if (status.planStatus === 'active') return false;
  if (status.planStatus === 'locked') return true;
  
  // If pilot and expired, lock the org
  if (status.planStatus === 'pilot' && status.isExpired) {
    const { error } = await supabase
      .from('orgs')
      .update({ plan_status: 'locked' })
      .eq('id', orgId);
    
    if (error) {
      console.error('Error locking expired pilot:', error);
    }
    
    return true;
  }
  
  return false;
}

/**
 * Convert pilot to paid subscription
 */
export async function convertToPaidSubscription(
  orgId: string,
  razorpaySubscriptionId: string,
  razorpayCustomerId?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const updateData: any = {
    plan_status: 'active',
    converted_at: now,
    razorpay_subscription_id: razorpaySubscriptionId,
  };
  
  if (razorpayCustomerId) {
    updateData.razorpay_customer_id = razorpayCustomerId;
  }
  
  const { error } = await supabase
    .from('orgs')
    .update(updateData)
    .eq('id', orgId);

  if (error) {
    console.error('Error converting to paid subscription:', error);
    throw error;
  }

  // Also update the subscriptions table for consistency
  await supabase.from('subscriptions').upsert({
    org_id: orgId,
    provider: 'razorpay',
    subscription_id: razorpaySubscriptionId,
    plan: 'growth',
    status: 'active',
  }, { onConflict: 'org_id' });
}
