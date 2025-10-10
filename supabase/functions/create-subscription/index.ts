import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { org_id, plan, quantity = 1 } = await req.json();
    
    if (!org_id || !plan) {
      throw new Error('Missing required fields: org_id, plan');
    }
    
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Verify user is org member
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      throw new Error('Not authorized for this organization');
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    // Get plan ID from env
    const planIdKey = `RAZORPAY_PLAN_${plan.toUpperCase()}`;
    const razorpayPlanId = Deno.env.get(planIdKey);
    
    if (!razorpayPlanId) {
      throw new Error(`Plan ${plan} not configured`);
    }

    // Create Razorpay subscription
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: 12, // 12 months
        quantity: quantity, // Number of users for team plan
        customer_notify: 1,
        notes: {
          org_id,
          plan,
          user_id: user.id,
          quantity: quantity,
        }
      })
    });

    if (!razorpayResponse.ok) {
      const error = await razorpayResponse.text();
      console.error('Razorpay error:', error);
      throw new Error('Failed to create subscription');
    }

    const subscription = await razorpayResponse.json();
    
    console.log('Created subscription:', subscription.id);

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        amount: subscription.plan_id,
        currency: 'INR',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
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
