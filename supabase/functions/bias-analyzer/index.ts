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
    const { jobId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Get shortlisted candidates for this job
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        candidates (
          full_name,
          headline,
          skills,
          years_experience,
          summary
        )
      `)
      .eq('job_id', jobId)
      .eq('stage', 'shortlisted');

    if (!applications || applications.length === 0) {
      throw new Error('No shortlisted candidates found');
    }

    const candidateProfiles = applications.map((app: any) => app.candidates);

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
            content: 'You analyze candidate shortlists for diversity and fairness. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Analyze this shortlist for diversity and potential biases. Return ONLY valid JSON.

Schema:
{
  "diversity_score": 0,
  "gender_balance": "string",
  "education_balance": "string",
  "skill_balance": "string",
  "issues": ["string"]
}

Shortlisted Candidates:
${JSON.stringify(candidateProfiles, null, 2)}

Provide:
- diversity_score: 0-100 score for overall diversity
- gender_balance: Distribution analysis (infer from names if needed)
- education_balance: College/university variety (if mentioned in profiles)
- skill_balance: Technical skill diversity analysis
- issues: Array of potential bias red flags or areas lacking diversity`
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
    const report = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Save bias report
    await supabase.from('bias_reports').insert({
      job_id: jobId,
      diversity_score: report.diversity_score,
      gender_balance: report.gender_balance,
      education_balance: report.education_balance,
      skill_balance: report.skill_balance,
      issues: report.issues
    });

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'shortlist',
      input_ref: jobId,
      output_json: report,
      latency_ms: latency,
      model_name: 'google/gemini-2.5-flash',
      status: 'ok',
      created_by: user.id
    });

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Error in bias-analyzer:', error);

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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
