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

    const body = await req.json();
    const { actionType, jobId, candidateId, payload = {} } = body;

    if (!actionType || !jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'actionType and jobId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing autopilot action: ${actionType} for job ${jobId}`);

    let status = 'completed';
    let actionPayload = { ...payload };
    let actionResult = null;

    try {
      switch (actionType) {
        case 'email_sent':
          // Simulate email sending - in production, integrate with Resend/SMTP
          actionPayload.simulated = true;
          actionPayload.message_preview = payload.body?.substring(0, 100);
          console.log('Email action (simulated):', payload.subject);
          break;

        case 'linkedin_message_sent':
          // LinkedIn is copy-only, just log that recruiter marked it as sent
          actionPayload.copy_only = true;
          console.log('LinkedIn message marked as sent');
          break;

        case 'fit_request_sent':
          // Call the create-fit-request function
          if (!candidateId) {
            throw new Error('candidateId required for fit request');
          }
          
          // Get candidate user_id
          const { data: candidate } = await supabase
            .from('candidates')
            .select('user_id')
            .eq('id', candidateId)
            .single();

          if (candidate) {
            const { error: fitError } = await supabase
              .from('role_dna_fit_requests')
              .insert({
                user_id: candidate.user_id,
                job_twin_job_id: jobId,
                requested_by_user_id: user.id,
                status: 'pending'
              });

            if (fitError) {
              console.error('Fit request error:', fitError);
              throw new Error('Failed to create fit request');
            }
            actionPayload.candidate_user_id = candidate.user_id;
          }
          console.log('Fit request created for candidate:', candidateId);
          break;

        case 'voice_interview_requested':
          // Start voice interview session
          if (!candidateId) {
            throw new Error('candidateId required for voice interview');
          }
          
          // Create a voice interview session entry
          const { data: interviewSession, error: interviewError } = await supabase
            .from('interview_simulation_sessions')
            .insert({
              user_id: candidateId,
              job_twin_job_id: jobId,
              role_title: payload.roleTitle || 'Interview',
              mode: 'mixed',
              difficulty: 'mid',
              status: 'pending'
            })
            .select()
            .single();

          if (interviewError) {
            console.error('Interview session error:', interviewError);
            throw new Error('Failed to create interview session');
          }
          
          actionPayload.session_id = interviewSession?.id;
          console.log('Voice interview session created:', interviewSession?.id);
          break;

        case 'stage_updated':
          // Update pipeline stage
          if (!candidateId || !payload.newStage) {
            throw new Error('candidateId and newStage required for stage update');
          }

          const { error: stageError } = await supabase
            .from('applications')
            .update({ stage: payload.newStage })
            .eq('candidate_id', candidateId)
            .eq('job_id', jobId);

          if (stageError) {
            console.error('Stage update error:', stageError);
            throw new Error('Failed to update stage');
          }
          
          actionPayload.previous_stage = payload.previousStage;
          console.log('Stage updated to:', payload.newStage);
          break;

        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }
    } catch (actionError) {
      console.error('Action execution error:', actionError);
      status = 'failed';
      actionPayload.error = actionError instanceof Error ? actionError.message : 'Unknown error';
    }

    // Log the action
    const { data: logEntry, error: logError } = await supabase
      .from('autopilot_action_logs')
      .insert({
        recruiter_user_id: user.id,
        job_twin_job_id: jobId,
        candidate_user_id: candidateId || null,
        action_type: actionType,
        action_payload: actionPayload,
        status
      })
      .select()
      .single();

    if (logError) {
      console.error('Log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: status === 'completed',
        status,
        logId: logEntry?.id,
        message: status === 'completed' 
          ? `Action ${actionType} executed successfully` 
          : `Action ${actionType} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Execute autopilot action error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
