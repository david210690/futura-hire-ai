import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const candidateId = url.searchParams.get('candidateId');
    const jobId = url.searchParams.get('jobId');

    if (!candidateId || !jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'candidateId and jobId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the latest shortlist score for this candidate and job
    const { data: score, error } = await supabase
      .from('shortlist_predictive_scores')
      .select('id, score, reasoning_json, created_at, updated_at')
      .eq('user_id', candidateId)
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching shortlist score:', error);
      throw error;
    }

    if (!score) {
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        score: score.score,
        reasoning: score.reasoning_json,
        createdAt: score.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-shortlist-score:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
