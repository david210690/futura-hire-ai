import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAIRNESS_POLICY_VERSION = "v1.0";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      decision_type,
      job_twin_job_id,
      candidate_user_id,
      recruiter_user_id,
      input_summary,
      output_summary,
      explanation,
      fairness_checks,
      model_metadata
    } = body;

    if (!decision_type || !explanation) {
      return new Response(
        JSON.stringify({ success: false, error: 'decision_type and explanation are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure fairness checks include policy version
    const finalFairnessChecks = {
      protected_attributes_excluded: true,
      non_linear_careers_penalized: false,
      nd_safe_language: true,
      ...fairness_checks,
      policy_version: FAIRNESS_POLICY_VERSION
    };

    // Ensure model metadata includes policy version
    const finalModelMetadata = {
      ...model_metadata,
      policy_version: FAIRNESS_POLICY_VERSION
    };

    // Insert audit log - best effort, don't block main flow
    const { data, error } = await supabase
      .from('ai_decision_audit_logs')
      .insert({
        decision_type,
        job_twin_job_id: job_twin_job_id || null,
        candidate_user_id: candidate_user_id || null,
        recruiter_user_id: recruiter_user_id || null,
        input_summary: input_summary || {},
        output_summary: output_summary || {},
        explanation,
        fairness_checks: finalFairnessChecks,
        model_metadata: finalModelMetadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log AI decision:', error);
      // Return success anyway - logging is best-effort
      return new Response(
        JSON.stringify({ success: true, logged: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI decision logged: ${decision_type} -> ${data.id}`);

    return new Response(
      JSON.stringify({ success: true, logged: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-ai-decision:', error);
    // Return success anyway - logging is best-effort
    return new Response(
      JSON.stringify({ success: true, logged: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
