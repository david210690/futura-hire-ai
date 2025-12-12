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
    const url = new URL(req.url);
    const decisionType = url.searchParams.get('decisionType');
    const jobId = url.searchParams.get('jobId');
    const candidateId = url.searchParams.get('candidateId');

    if (!decisionType) {
      return new Response(
        JSON.stringify({ success: false, error: 'decisionType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query
    let query = supabase
      .from('ai_decision_audit_logs')
      .select('*')
      .eq('decision_type', decisionType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobId) {
      query = query.eq('job_twin_job_id', jobId);
    }

    if (candidateId) {
      query = query.eq('candidate_user_id', candidateId);
    }

    const { data: log, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch explanation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!log) {
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse explanation if it's JSON-like
    let parsedExplanation = log.explanation;
    try {
      if (log.explanation.startsWith('{')) {
        parsedExplanation = JSON.parse(log.explanation);
      }
    } catch {
      // Keep as string
    }

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        explanation: parsedExplanation,
        fairness_checks: log.fairness_checks,
        model_metadata: log.model_metadata,
        created_at: log.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-ai-explanation:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
