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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { jobId, roleTitle, mode, difficulty } = await req.json();

    if (!jobId && !roleTitle) {
      return new Response(JSON.stringify({ error: 'Either jobId or roleTitle is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting voice interview for user ${user.id}, job: ${jobId || 'N/A'}, role: ${roleTitle || 'N/A'}`);

    // Fetch job details if jobId provided
    let jobTitle = roleTitle;
    let jobDescription = '';
    if (jobId) {
      const { data: jobTwinJob } = await supabase
        .from('job_twin_jobs')
        .select(`
          id,
          job:jobs (
            title,
            jd_text,
            companies (name)
          )
        `)
        .eq('id', jobId)
        .single();

      const job = jobTwinJob?.job as any;
      if (job) {
        jobTitle = job.title;
        jobDescription = job.jd_text || '';
      }
    }

    // Fetch candidate profile for context
    let candidateSummary = '';
    const { data: profile } = await supabase
      .from('job_twin_profiles')
      .select('ideal_role, skills, career_goals')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      candidateSummary = `Role: ${profile.ideal_role || 'N/A'}, Skills: ${(profile.skills || []).join(', ')}`;
    }

    // Create voice interview session in DB
    const { data: session, error: sessionError } = await supabase
      .from('voice_interview_sessions')
      .insert({
        user_id: user.id,
        job_twin_job_id: jobId || null,
        mode: mode || 'mixed',
        difficulty: difficulty || 'mid',
        role_title: jobTitle || roleTitle,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created session ${session.id}`);

    // Get Retell credentials
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    const retellAgentId = Deno.env.get('RETELL_AGENT_ID');

    if (!retellApiKey || !retellAgentId) {
      console.error('Retell credentials not configured');
      await supabase
        .from('voice_interview_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);

      return new Response(JSON.stringify({ error: 'Voice interview service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Retell API to create web call session
    const retellPayload = {
      agent_id: retellAgentId,
      metadata: {
        futurhire_session_id: session.id,
        user_id: user.id,
        job_twin_job_id: jobId || null,
        mode: mode || 'mixed',
        difficulty: difficulty || 'mid',
        role_title: jobTitle || roleTitle,
        candidate_summary: candidateSummary,
        job_description: jobDescription?.substring(0, 500), // Truncate for metadata
        source: 'futurhire-web',
      },
    };

    console.log('Calling Retell API...');
    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retellPayload),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('Retell API error:', retellResponse.status, errorText);
      
      await supabase
        .from('voice_interview_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);

      return new Response(JSON.stringify({ error: 'Failed to create voice session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const retellData = await retellResponse.json();
    console.log('Retell response:', JSON.stringify(retellData));

    // Update session with Retell data
    // Retell v2 web call returns: call_id, web_call_link, access_token
    const retellSessionId = retellData.call_id || retellData.id;
    const joinUrl = retellData.web_call_link || retellData.url;

    await supabase
      .from('voice_interview_sessions')
      .update({
        retell_session_id: retellSessionId,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    console.log(`Session ${session.id} started with Retell ID: ${retellSessionId}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId: session.id,
      retellSessionId: retellSessionId,
      joinUrl: joinUrl,
      accessToken: retellData.access_token, // For embedded SDK if needed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in voice-interview-start:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
