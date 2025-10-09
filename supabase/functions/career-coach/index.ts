import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase;

  try {
    const { candidateId, resumeText, jobId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Get candidate's org via user
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!orgMember) throw new Error('No organization found');

    // Check entitlement
    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('enabled')
      .eq('org_id', orgMember.org_id)
      .eq('feature', 'feature_career_coach')
      .maybeSingle();

    if (!entitlement?.enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'Upgrade required',
          needed_feature: 'feature_career_coach',
          message: 'Career Coach feature requires an upgrade.'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check and increment usage
    const { data: usageResult, error: usageError } = await supabase.rpc('increment_usage', {
      _org_id: orgMember.org_id,
      _metric: 'coach_runs'
    });

    if (usageError) {
      console.error('Usage tracking error:', usageError);
    }

    if (usageResult && usageResult[0]) {
      const { count, limit_value } = usageResult[0];
      if (count > limit_value) {
        return new Response(
          JSON.stringify({ 
            error: 'Quota exceeded',
            message: `Daily career coach limit reached (${limit_value}/day). Try again tomorrow.`,
            quota: limit_value,
            used: count
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Rate limit: 2 runs per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('career_coach_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .gte('created_at', hourAgo);

    if (count && count >= 2) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get optional job description
    let jdText = '';
    if (jobId) {
      const { data: job } = await supabase
        .from('jobs')
        .select('jd_text, title')
        .eq('id', jobId)
        .maybeSingle();
      
      if (job) {
        jdText = `Target role: ${job.title}\n\n${job.jd_text}`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert career coach for tech roles. Output ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Using the candidate resume${jdText ? ' and the job description' : ''}, list missing skills, 3–6 resume improvement suggestions, and 5–8 practice interview questions. Be specific and concise. Return ONLY valid JSON.

Schema:
{
  "missing_skills": ["string"],
  "resume_suggestions": ["string"],
  "interview_questions": ["string"]
}

${jdText ? `Job Description:\n${jdText}\n\n` : ''}Resume:
${resumeText}`
          }
        ],
        temperature: 0.4,
      }),
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const feedback = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Save feedback
    await supabase.from('career_coach_feedback').insert({
      candidate_id: candidateId,
      job_id: jobId,
      missing_skills: feedback.missing_skills,
      resume_suggestions: feedback.resume_suggestions,
      interview_questions: feedback.interview_questions
    });

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'parse',
      input_ref: candidateId,
      output_json: feedback,
      latency_ms: latency,
      model_name: 'google/gemini-2.5-flash',
      status: 'ok',
      created_by: user.id
    });

    return new Response(
      JSON.stringify({ success: true, feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Error in career-coach:', error);

    if (supabase) {
      try {
        await supabase.from('ai_runs').insert({
          kind: 'parse',
          status: 'error',
          error_message: error.message,
          latency_ms: latency,
          model_name: 'google/gemini-2.5-flash'
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
