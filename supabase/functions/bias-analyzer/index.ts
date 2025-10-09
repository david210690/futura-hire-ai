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

    // Get job details with org_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, org_id')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Check entitlement
    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('enabled')
      .eq('org_id', job.org_id)
      .eq('feature', 'feature_bias_analyzer')
      .maybeSingle();

    if (!entitlement?.enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'Upgrade required',
          needed_feature: 'feature_bias_analyzer',
          message: 'Bias Analyzer feature requires an upgrade. Contact admin to enable.'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check and increment usage
    const { data: usageResult, error: usageError } = await supabase.rpc('increment_usage', {
      _org_id: job.org_id,
      _metric: 'bias_runs'
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
            message: `Daily bias analysis limit reached (${limit_value}/day). Try again tomorrow.`,
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

    // Rate limit: 2 runs per hour per job
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('bias_reports')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .gte('created_at', hourAgo);

    if (count && count >= 2) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shortlisted candidates for this job
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        id,
        candidate_id,
        candidates (
          full_name,
          skills,
          summary,
          years_experience
        )
      `)
      .eq('job_id', jobId)
      .eq('stage', 'shortlist')
      .limit(50);

    if (!applications || applications.length === 0) {
      throw new Error('No shortlisted candidates found');
    }

    // Get resume data for candidates
    const candidateIds = applications.map((app: any) => app.candidate_id);
    const { data: resumes } = await supabase
      .from('resumes')
      .select('candidate_id, parsed_text')
      .in('candidate_id', candidateIds);

    const resumeMap = new Map(resumes?.map(r => [r.candidate_id, r.parsed_text]) || []);

    // Build candidate array with all available info
    const candidatesData = applications.map((app: any) => ({
      name: app.candidates?.full_name,
      skills: app.candidates?.skills,
      summary: app.candidates?.summary,
      years_experience: app.candidates?.years_experience,
      resume_text: resumeMap.get(app.candidate_id) || ''
    }));

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
            content: 'You analyze hiring shortlists for diversity/fairness patterns. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Given these candidates (with any available gender hints from names, education hints from resume text, and skills), estimate a diversity snapshot. If unknown, label as "unknown". Score 0–100 where 100 is healthiest mix. Return ONLY valid JSON.

Schema:
{
  "diversity_score": 0,
  "gender_balance": "string",
  "education_balance": "string",
  "skill_balance": "string",
  "issues": ["string"]
}

Candidates JSON:
${JSON.stringify(candidatesData, null, 2)}`
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
      kind: 'bias',
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
          kind: 'bias',
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
