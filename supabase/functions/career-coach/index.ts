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
            content: 'You are an AI career coach. Provide actionable resume feedback. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Analyze this resume and provide career coaching feedback. Return ONLY valid JSON.

Schema:
{
  "missing_skills": ["string"],
  "resume_suggestions": ["string"],
  "interview_questions": ["string"]
}

${jdText ? `${jdText}\n\n` : ''}Resume:
${resumeText}

Provide:
- missing_skills: Skills needed for target roles (or general market skills)
- resume_suggestions: 3-5 specific improvements with examples
- interview_questions: 3-5 practice questions for target role`
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
