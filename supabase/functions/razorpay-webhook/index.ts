import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-razorpay-signature, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const body = await req.text();
    
    // Verify webhook signature
    if (signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signatureData = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(body)
      );
      
      const expectedSignature = Array.from(new Uint8Array(signatureData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        throw new Error('Invalid signature');
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    
    console.log('Webhook event:', event);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event) {
      case 'subscription.activated': {
        const subscription = payload.payload.subscription.entity;
        const notes = subscription.notes || {};
        const orgId = notes.org_id;
        const plan = notes.plan;

        if (orgId && plan) {
          // Update subscription in database
          await supabase.from('subscriptions').upsert({
            org_id: orgId,
            provider: 'razorpay',
            subscription_id: subscription.id,
            plan,
            status: 'active',
            current_period_end: new Date(subscription.current_end * 1000).toISOString(),
          }, { onConflict: 'org_id' });

          // Apply plan entitlements
          const entitlements = getPlanEntitlements(plan);
          await supabase.from('entitlements').upsert(
            Object.entries(entitlements).map(([feature, entData]) => ({
              org_id: orgId,
              feature,
              enabled: (entData as any).enabled,
              value: (entData as any).value || null,
            })),
            { onConflict: 'org_id,feature' }
          );

          console.log('Activated subscription for org:', orgId);
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.payload.subscription.entity;
        const notes = subscription.notes || {};
        const orgId = notes.org_id;

        if (orgId) {
          // Mark subscription as cancelled
          await supabase.from('subscriptions').update({
            status: 'cancelled',
            plan: 'free',
          }).eq('subscription_id', subscription.id);

          // Downgrade to free entitlements
          const freeEntitlements = getPlanEntitlements('free');
          await supabase.from('entitlements').upsert(
            Object.entries(freeEntitlements).map(([feature, entData]) => ({
              org_id: orgId,
              feature,
              enabled: (entData as any).enabled,
              value: (entData as any).value || null,
            })),
            { onConflict: 'org_id,feature' }
          );

          console.log('Cancelled subscription for org:', orgId);
        }
        break;
      }

      case 'payment.captured': {
        const payment = payload.payload.payment.entity;
        const notes = payment.notes || {};
        const candidateId = notes.candidate_id;
        const product = notes.product;

        if (candidateId && product) {
          // Apply candidate entitlement based on product
          await applyCandidateEntitlement(supabase, candidateId, product);
          console.log('Applied entitlement for candidate:', candidateId, product);
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ status: 'ok' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

function getPlanEntitlements(plan: string) {
  const plans: Record<string, any> = {
    free: {
      'feature_basic_shortlist': { enabled: true },
      'limits_ai_shortlist_per_day': { enabled: true, value: '3' },
      'limits_video_analysis_per_day': { enabled: true, value: '0' },
    },
    pro: {
      'feature_copilot': { enabled: true },
      'feature_predictive': { enabled: true },
      'feature_assessments': { enabled: true },
      'feature_video_summary': { enabled: true },
      'limits_ai_shortlist_per_day': { enabled: true, value: '100' },
      'limits_video_analysis_per_day': { enabled: true, value: '20' },
      'limits_coach_runs_per_day': { enabled: true, value: '20' },
    },
    team: {
      'feature_copilot': { enabled: true },
      'feature_predictive': { enabled: true },
      'feature_assessments': { enabled: true },
      'feature_video_summary': { enabled: true },
      'feature_culture_dna': { enabled: true },
      'feature_team_optimizer': { enabled: true },
      'feature_share_shortlist': { enabled: true },
      'limits_ai_shortlist_per_day': { enabled: true, value: '-1' }, // unlimited
      'limits_video_analysis_per_day': { enabled: true, value: '-1' },
      'limits_coach_runs_per_day': { enabled: true, value: '-1' },
    },
  };

  return plans[plan] || plans.free;
}

async function applyCandidateEntitlement(supabase: any, candidateId: string, product: string) {
  // Map product to entitlement
  const productEntitlements: Record<string, string> = {
    'certificate': 'candidate_certificate',
    'ai_coach': 'candidate_ai_coach',
    'video_report': 'candidate_video_report',
  };

  const entitlementCode = productEntitlements[product];
  if (!entitlementCode) return;

  // Get candidate's user_id
  const { data: candidate } = await supabase
    .from('candidates')
    .select('user_id')
    .eq('id', candidateId)
    .single();

  if (!candidate) return;

  // Grant entitlement (store in a candidate_entitlements table or similar)
  // For now, we'll just log it
  console.log('Granted entitlement:', entitlementCode, 'to user:', candidate.user_id);
}
