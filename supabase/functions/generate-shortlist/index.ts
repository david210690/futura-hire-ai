import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 5 shortlist requests per recruiter per hour
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  const timestamps = rateLimitMap.get(userId) || [];
  const recentCalls = timestamps.filter(t => t > hourAgo);
  
  if (recentCalls.length >= 5) {
    return false;
  }
  
  recentCalls.push(now);
  rateLimitMap.set(userId, recentCalls);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase;

  try {
    const { jobId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      throw new Error('Rate limit exceeded. Maximum 5 shortlists per hour.');
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Get all candidates with resumes
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select(`
        id,
        full_name,
        headline,
        years_experience,
        skills,
        summary,
        resumes(parsed_text)
      `);

    if (candidatesError) throw candidatesError;

    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates found in the system');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Generate shortlist
    const candidateProfiles = candidates.map(c => ({
      id: c.id,
      name: c.full_name,
      headline: c.headline,
      years: c.years_experience,
      skills: c.skills,
      summary: c.summary,
    }));

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
            content: 'You rank candidates for a job using skills, experience, and domain context. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Given the JD and candidate profiles, return the best 5 matches with scores and reasons, plus 3-5 tailored interview questions. Keep reasons to 1-2 lines.

Schema:
{
  "top": [
    {
      "candidate_id": "uuid",
      "skill_fit_score": 0,
      "shortlist_reason": "string",
      "key_matching_skills": ["string"]
    }
  ],
  "interview_questions": ["string"]
}

JD: ${job.jd_text}

Candidates:
${JSON.stringify(candidateProfiles, null, 2)}`
          }
        ],
        temperature: 0.3,
      }),
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Insert applications (use "top" key from schema)
    const matches = result.top || result.matches || result.top_matches || [];
    for (const match of matches.slice(0, 5)) {
      await supabase.from('applications').insert({
        job_id: jobId,
        candidate_id: match.candidate_id,
        skill_fit_score: match.skill_fit_score,
        culture_fit_score: 0,
        overall_score: Math.round(match.skill_fit_score * 0.6),
        shortlist_reason: match.shortlist_reason,
        stage: 'shortlisted',
        status: 'shortlisted',
        explanations: { key_skills: match.key_matching_skills },
        ai_version: 'gemini-2.5-flash'
      });
    }

    // Insert interview questions
    for (const q of (result.interview_questions || []).slice(0, 5)) {
      await supabase.from('interview_questions').insert({
        job_id: jobId,
        question: typeof q === 'string' ? q : q.question,
        source: 'auto'
      });
    }

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'shortlist',
      input_ref: jobId,
      output_json: result,
      latency_ms: latency,
      model_name: 'google/gemini-2.5-flash',
      status: 'ok',
      created_by: user.id
    });

    // Log audit
    await supabase.rpc('log_audit', {
      p_action: 'generate_shortlist',
      p_entity_type: 'job',
      p_entity_id: jobId,
      p_meta_json: { candidates_shortlisted: matches.length }
    });

    return new Response(
      JSON.stringify({ success: true, shortlisted: matches.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Error in generate-shortlist:', error);

    // Log failed AI run if we have supabase client
    if (supabase) {
      try {
        await supabase.from('ai_runs').insert({
          kind: 'shortlist',
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
      { status: error.message.includes('Rate limit') ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
