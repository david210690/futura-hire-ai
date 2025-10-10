import { supabase } from "@/integrations/supabase/client";

const TRIAL_DAYS = 14;

export interface TrialStatus {
  state: 'trial' | 'paid' | 'free';
  daysLeft?: number;
  endsAt?: string;
  plan?: string;
}

/**
 * Start a 14-day trial for a new organization
 */
export async function startOrgTrial(orgId: string) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + TRIAL_DAYS);

  const { error } = await supabase.from("subscriptions").upsert({
    org_id: orgId,
    provider: "razorpay",
    subscription_id: null,
    plan: "trial",
    status: "active",
    trial_start_at: now.toISOString(),
    trial_end_at: end.toISOString(),
    trial_status: "active"
  }, { onConflict: "org_id" });

  if (error) {
    console.error('Error starting trial:', error);
    throw error;
  }
}

/**
 * Apply generous trial entitlements to the organization
 */
export async function applyTrialEntitlements(orgId: string) {
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
    { feature: 'limits_ai_shortlist_per_day', enabled: true, value: '30' },
    { feature: 'limits_video_analysis_per_day', enabled: true, value: '10' },
    { feature: 'limits_coach_runs_per_day', enabled: true, value: '10' },
    { feature: 'limits_bias_runs_per_day', enabled: true, value: '10' },
    { feature: 'limits_marketing_runs_per_day', enabled: true, value: '10' },
    { feature: 'limits_copilot_per_day', enabled: true, value: '50' },
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
    console.error('Error applying trial entitlements:', error);
    throw error;
  }
}

/**
 * Check if trial has expired and downgrade to free if needed
 */
export async function expireTrialIfNeeded(orgId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("trial_end_at, trial_status, plan")
    .eq("org_id", orgId)
    .single();

  if (error || !data?.trial_end_at || data.trial_status !== "active") {
    return;
  }

  const now = new Date();
  const end = new Date(data.trial_end_at);
  
  if (now >= end) {
    // Mark trial as expired
    await supabase.from("subscriptions")
      .update({ 
        trial_status: "expired", 
        plan: "free", 
        status: "active" 
      })
      .eq("org_id", orgId);

    // Downgrade to Free plan entitlements
    const freeFeatures = [
      { feature: 'feature_basic_shortlist', enabled: true },
      { feature: 'feature_copilot', enabled: false },
      { feature: 'feature_predictive', enabled: false },
      { feature: 'feature_gamification', enabled: false },
      { feature: 'feature_assessments', enabled: false },
      { feature: 'feature_culture_dna', enabled: false },
      { feature: 'feature_video_summary', enabled: false },
      { feature: 'feature_marketing_assets', enabled: false },
      { feature: 'feature_role_designer', enabled: false },
      { feature: 'feature_retention', enabled: false },
      { feature: 'feature_team_optimizer', enabled: false },
      { feature: 'feature_share_shortlist', enabled: false },
      { feature: 'limits_ai_shortlist_per_day', enabled: true, value: '3' },
      { feature: 'limits_video_analysis_per_day', enabled: true, value: '0' },
      { feature: 'limits_coach_runs_per_day', enabled: true, value: '0' },
      { feature: 'limits_bias_runs_per_day', enabled: true, value: '0' },
      { feature: 'limits_marketing_runs_per_day', enabled: true, value: '0' },
      { feature: 'limits_copilot_per_day', enabled: true, value: '0' },
    ];

    await supabase
      .from('entitlements')
      .upsert(
        freeFeatures.map(f => ({
          org_id: orgId,
          feature: f.feature,
          enabled: f.enabled,
          value: f.value || null,
        })),
        { onConflict: 'org_id,feature' }
      );
  }
}

/**
 * Get current trial status for an organization
 */
export async function getTrialStatus(orgId: string): Promise<TrialStatus> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, trial_start_at, trial_end_at, trial_status")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error('Error getting trial status:', error);
    return { state: "free" };
  }

  if (!data) {
    return { state: "free" };
  }

  const now = new Date();
  const end = data.trial_end_at ? new Date(data.trial_end_at) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((+end - +now) / (1000 * 60 * 60 * 24))) : 0;

  if (data.plan === "trial" && data.trial_status === "active") {
    return { 
      state: "trial", 
      daysLeft, 
      endsAt: end?.toISOString() 
    };
  }

  if (["pro", "team", "enterprise"].includes((data.plan || "").toLowerCase())) {
    return { 
      state: "paid", 
      plan: data.plan 
    };
  }

  return { state: "free" };
}
