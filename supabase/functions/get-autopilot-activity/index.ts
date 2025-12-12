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
    const jobId = url.searchParams.get('jobId');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'jobId is required' }),
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

    // Fetch action logs
    const { data: logs, error: fetchError } = await supabase
      .from('autopilot_action_logs')
      .select('*')
      .eq('job_twin_job_id', jobId)
      .eq('recruiter_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch activity logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get candidate names for logs that have candidate_user_id
    const candidateIds = [...new Set(logs?.filter(l => l.candidate_user_id).map(l => l.candidate_user_id) || [])];
    let candidateMap: Record<string, string> = {};

    if (candidateIds.length > 0) {
      const { data: candidates } = await supabase
        .from('candidates')
        .select('user_id, full_name')
        .in('user_id', candidateIds);

      if (candidates) {
        candidateMap = Object.fromEntries(candidates.map(c => [c.user_id, c.full_name]));
      }
    }

    // Enrich logs with candidate names
    const enrichedLogs = logs?.map(log => ({
      ...log,
      candidate_name: log.candidate_user_id ? candidateMap[log.candidate_user_id] : null
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        logs: enrichedLogs || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get autopilot activity error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
