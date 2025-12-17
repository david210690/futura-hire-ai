import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Growth plan ID - the only plan available during pilot
const GROWTH_PLAN_ID = "plan_RseqcRypIbyLm9";

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

    const { org_id, plan, plan_id } = await req.json();
    
    if (!org_id) {
      throw new Error('Missing required field: org_id');
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

    // Use provided plan_id or get from env, default to Growth plan
    let razorpayPlanId = plan_id || GROWTH_PLAN_ID;
    
    // If plan is specified, try to get from env (for backwards compatibility)
    if (plan && !plan_id) {
      const planIdKey = `RAZORPAY_PLAN_${plan.toUpperCase()}`;
      const envPlanId = Deno.env.get(planIdKey);
      if (envPlanId) {
        razorpayPlanId = envPlanId;
      }
    }

    // Create Razorpay customer first (optional but recommended)
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    // Fetch user email for customer creation
    const { data: userData } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', user.id)
      .single();

    let customerId = null;
    
    // Try to create customer
    try {
      const customerResponse = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData?.name || 'Customer',
          email: userData?.email || user.email,
          notes: {
            org_id,
            user_id: user.id,
          }
        })
      });

      if (customerResponse.ok) {
        const customer = await customerResponse.json();
        customerId = customer.id;
      }
    } catch (e) {
      console.log('Customer creation skipped:', e);
    }

    // Create Razorpay subscription
    const subscriptionBody: any = {
      plan_id: razorpayPlanId,
      total_count: 12, // 12 billing cycles (annual = 1 year)
      customer_notify: 1,
      notes: {
        org_id,
        plan: plan || 'growth',
        user_id: user.id,
      }
    };

    if (customerId) {
      subscriptionBody.customer_id = customerId;
    }

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionBody)
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
        amount: 3000000, // ₹30,000 in paise
        currency: 'INR',
        customer_id: customerId,
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
