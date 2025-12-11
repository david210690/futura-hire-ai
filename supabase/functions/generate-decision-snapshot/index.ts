import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DECISION_ROOM_SYSTEM_PROMPT = `You are an experienced hiring manager and talent strategist for an AI-driven recruitment platform called FuturHire. Your job is to review a list of candidates for a single role and:
- cluster them into meaningful groups (e.g., "Top Match", "Promising but Risky", "Wildcards", "Not Recommended"),
- assign a 0–100 fit score to each candidate,
- summarize each candidate's fit and risks in 2–3 sentences,
- and recommend a clear next action for each candidate.

Important constraints:
- YOU MUST RETURN ONLY VALID JSON, no surrounding text, no explanations.
- Use the exact JSON schema provided.
- All numeric scores must be integers between 0 and 100.
- If some information is missing, make a reasonable best-effort guess and mention that in feedback, but still return complete JSON.
- Be realistic and honest in your assessments.
- Do not assume missing information; treat unknowns as unknowns.

Scoring guidelines:
- 90-100: Exceptional match, highly recommend proceeding immediately
- 75-89: Strong match with minor gaps, recommend next steps
- 60-74: Moderate match, requires further evaluation
- 40-59: Weak match, significant concerns
- 0-39: Not recommended for this role

JSON Schema to follow:
{
  "clusters": [
    {
      "name": "string (e.g., Top Match, Promising but Risky, Wildcards, Not Recommended)",
      "description": "string explaining this cluster",
      "candidate_ids": ["array of candidate ids"]
    }
  ],
  "candidates": [
    {
      "candidate_id": "string",
      "overall_fit_score": 0-100,
      "summary": "2–3 line narrative of fit",
      "risks": ["array of risk strings"],
      "recommended_next_action": "string (e.g., Schedule final interview, Technical round needed, Reject, Cultural fit assessment)"
    }
  ],
  "global_summary": {
    "market_insight": "Overall observation about the talent pool",
    "hiring_recommendation": "Strategic recommendation for the hiring manager"
  }
}`;

function buildUserPrompt(job: any, candidates: any[]): string {
  const candidatesList = candidates.map(c => ({
    candidate_id: c.candidate_id,
    name: c.name,
    headline: c.headline || "Not specified",
    skills: c.skills || "Not specified",
    years_experience: c.years_experience || "Unknown",
    existing_scores: c.existing_scores
  }));

  return `You are evaluating candidates for a job opening at FuturHire.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company_name || "Not specified"}
- Location: ${job.location}
- Employment Type: ${job.employment_type}
- Seniority Level: ${job.seniority}
- Remote Mode: ${job.remote_mode || "Not specified"}

JOB DESCRIPTION:
${job.jd_text}

CANDIDATES TO EVALUATE:
${JSON.stringify(candidatesList, null, 2)}

Instructions:
1. Analyze each candidate against the job requirements.
2. Cluster candidates into meaningful groups based on their fit.
3. Provide individual assessments with scores, summaries, risks, and next actions.
4. Generate a global summary with market insights and hiring recommendations.

Remember:
- Return ONLY valid JSON matching the schema exactly.
- Be realistic and honest.
- If a candidate lacks information, note it in your assessment.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ success: false, message: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Generating decision snapshot for job ${jobId} by user ${user.id}`);

    // Fetch job details with company
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id, title, location, employment_type, seniority, jd_text, remote_mode, org_id,
        companies (name)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job fetch error:', jobError);
      return new Response(JSON.stringify({ success: false, message: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch applications with candidate details
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select(`
        id, skill_fit_score, culture_fit_score, overall_score,
        candidates (
          id, full_name, headline, skills, years_experience, summary
        )
      `)
      .eq('job_id', jobId);

    if (appsError) {
      console.error('Applications fetch error:', appsError);
      return new Response(JSON.stringify({ success: false, message: 'Failed to fetch applications' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No candidates found for this job. Generate a shortlist first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build candidates array for LLM
    const candidates = applications.map(app => {
      const candidate = app.candidates as any;
      return {
        candidate_id: candidate?.id,
        name: candidate?.full_name || 'Unknown',
        headline: candidate?.headline,
        skills: candidate?.skills,
        years_experience: candidate?.years_experience,
        summary: candidate?.summary,
        existing_scores: {
          skill_fit: app.skill_fit_score,
          culture_fit: app.culture_fit_score,
          overall: app.overall_score
        }
      };
    }).filter(c => c.candidate_id);

    console.log(`Processing ${candidates.length} candidates for decision room`);

    // Prepare job object for prompt
    const jobForPrompt = {
      title: job.title,
      company_name: (job.companies as any)?.name,
      location: job.location,
      employment_type: job.employment_type,
      seniority: job.seniority,
      jd_text: job.jd_text,
      remote_mode: job.remote_mode
    };

    // Call LLM
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, message: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();
    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: DECISION_ROOM_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(jobForPrompt, candidates) }
        ],
        temperature: 0.2
      })
    });

    const latencyMs = Date.now() - startTime;

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error:', llmResponse.status, errorText);
      
      if (llmResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, message: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (llmResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, message: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ success: false, message: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const llmData = await llmResponse.json();
    const responseContent = llmData.choices?.[0]?.message?.content || '';
    
    console.log('LLM response received, parsing JSON...');

    // Parse JSON from response
    let snapshotData: any;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = responseContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      snapshotData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', responseContent);
      
      // Create a fallback snapshot
      snapshotData = {
        clusters: [{
          name: "Evaluation Error",
          description: "AI analysis could not be completed properly. Please try regenerating.",
          candidate_ids: candidates.map(c => c.candidate_id)
        }],
        candidates: candidates.map(c => ({
          candidate_id: c.candidate_id,
          overall_fit_score: c.existing_scores?.overall || 50,
          summary: "Evaluation could not be completed. Please try again.",
          risks: ["Evaluation incomplete"],
          recommended_next_action: "Manual review required"
        })),
        global_summary: {
          market_insight: "AI analysis encountered an error.",
          hiring_recommendation: "Please regenerate the decision snapshot or review candidates manually."
        }
      };
    }

    // Use service role client for insert
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Store snapshot in database
    const { data: snapshot, error: insertError } = await supabaseService
      .from('job_decision_snapshots')
      .insert({
        job_id: jobId,
        generated_by_user_id: user.id,
        snapshot_json: snapshotData
      })
      .select()
      .single();

    if (insertError) {
      console.error('Snapshot insert error:', insertError);
      return new Response(JSON.stringify({ success: false, message: 'Failed to save decision snapshot' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log AI run
    await supabaseService.from('ai_runs').insert({
      kind: 'decision_room',
      created_by: user.id,
      input_ref: jobId,
      status: 'ok',
      latency_ms: latencyMs,
      model_name: 'google/gemini-2.5-pro',
      output_json: { snapshot_id: snapshot.id }
    });

    console.log(`Decision snapshot ${snapshot.id} created successfully in ${latencyMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      snapshot: {
        id: snapshot.id,
        job_id: snapshot.job_id,
        created_at: snapshot.created_at,
        data: snapshotData
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
