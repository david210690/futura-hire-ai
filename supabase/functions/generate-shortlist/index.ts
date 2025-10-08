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

  try {
    const { jobId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Generate shortlist
    const candidateProfiles = candidates.map(c => ({
      id: c.id,
      name: c.full_name,
      headline: c.headline,
      years: c.years_experience,
      skills: c.skills,
      summary: c.summary,
      resume: c.resumes?.[0]?.parsed_text
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
            content: 'You are a recruitment AI. Analyze job requirements and rank candidates. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Job Description:\n${job.jd_text}\n\nCandidates:\n${JSON.stringify(candidateProfiles, null, 2)}\n\nReturn top 5 matches as JSON array with: candidate_id, skill_fit_score (0-100), shortlist_reason (1-2 sentences), key_matching_skills (array). Also generate 3-5 interview questions for this role as 'interview_questions' array.`
          }
        ],
        temperature: 0.4,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Insert applications
    for (const match of result.matches || result.top_matches || []) {
      await supabase.from('applications').insert({
        job_id: jobId,
        candidate_id: match.candidate_id,
        skill_fit_score: match.skill_fit_score,
        culture_fit_score: 0,
        overall_score: Math.round(match.skill_fit_score * 0.6),
        shortlist_reason: match.shortlist_reason,
        status: 'shortlisted'
      });
    }

    // Insert interview questions
    for (const q of result.interview_questions || []) {
      await supabase.from('interview_questions').insert({
        job_id: jobId,
        question: typeof q === 'string' ? q : q.question,
        source: 'auto'
      });
    }

    return new Response(
      JSON.stringify({ success: true, shortlisted: result.matches?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-shortlist:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
