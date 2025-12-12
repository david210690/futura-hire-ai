import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HIRING_AUTOPILOT_SYSTEM_PROMPT = `
You are a recruiting operations lead and hiring strategist.

Create a "Hiring Plan Autopilot" for a single job.
Inputs include: the job's Role DNA, pipeline health signals, and candidate scores.

Your output MUST be practical and immediately actionable:
- A 7-day plan (daily checklist)
- A 30-day plan (weekly milestones)
- Pipeline bottleneck fixes
- Candidate prioritization list with next actions
- Interview kit aligned to Role DNA:
  - interview rounds
  - what to test
  - question bank (behavioral + role-specific)
  - evaluation rubric (clear, ND-safe language)
- Outreach templates to accelerate pipeline:
  - Email follow-up template
  - LinkedIn message template
  - Candidate scheduling message template
- A "Recruiting Rhythm" (weekly cadence)

FAIRNESS + ND-SAFE RULES:
- Do NOT infer any protected attributes (gender, ethnicity, age, religion, disability, family status, etc.).
- Do NOT penalize non-linear careers or ND communication styles.
- Use supportive, neutral language:
  - "alignment", "signals", "growth areas", "next steps"
- This plan is a guide, not a guarantee.

Return ONLY valid JSON with this schema:

{
  "overview": {
    "summary": "2-4 sentences",
    "north_star": "One sentence goal for this hire",
    "assumptions": [
      "Any assumptions based on missing data"
    ],
    "disclaimer": "One sentence: guidance, not guarantee"
  },
  "priority_candidates": [
    {
      "candidateId": "...",
      "priority_reason": "Evidence-based reason",
      "next_action": "Concrete next step",
      "suggested_stage_move": "e.g., move to interview / schedule technical / etc."
    }
  ],
  "bottlenecks_and_fixes": [
    {
      "stage": "screening/interview/offer/etc.",
      "issue": "What is blocking flow",
      "evidence": "Evidence from data",
      "fix": [
        "Concrete actions"
      ]
    }
  ],
  "plan_7_days": [
    {
      "day": 1,
      "focus": "Theme",
      "tasks": [
        "Checklist items"
      ]
    }
  ],
  "plan_30_days": [
    {
      "week": 1,
      "goal": "Milestone",
      "tasks": [
        "Checklist items"
      ],
      "success_criteria": [
        "How we know this week succeeded"
      ]
    }
  ],
  "interview_kit": {
    "rounds": [
      {
        "round_name": "Recruiter screen / Hiring manager / Technical / Culture",
        "what_to_test": [
          "Role DNA aligned competencies"
        ],
        "question_bank": [
          "Short questions"
        ],
        "evaluation_rubric": [
          {
            "dimension": "e.g., communication clarity",
            "what_good_looks_like": [
              "ND-safe, observable behaviors"
            ],
            "red_flags_to_avoid": [
              "Bias traps recruiters should avoid"
            ]
          }
        ]
      }
    ]
  },
  "templates": {
    "email_followup": {
      "subject": "string",
      "body": "string"
    },
    "linkedin_message": "string",
    "scheduling_message": "string"
  },
  "recruiting_rhythm": {
    "weekly_cadence": [
      "Example: Monday pipeline review, Tue outreach, Wed interviews..."
    ],
    "metrics_to_track": [
      "Example: stage conversion, time-to-schedule, interview pass rate"
    ]
  }
}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

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

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('job_twin_jobs')
      .select(`
        id,
        status,
        match_score,
        match_reasons,
        job:jobs(id, title, seniority, jd_text, location, employment_type, tags)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job fetch error:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Role DNA snapshot (required)
    const { data: roleDna, error: roleDnaError } = await supabase
      .from('role_dna_snapshots')
      .select('*')
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!roleDna) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'NO_ROLE_DNA', 
          message: 'Generate Role DNA for this job first.' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Pipeline Health snapshot (optional)
    const { data: pipelineHealth } = await supabase
      .from('pipeline_health_snapshots')
      .select('*')
      .eq('job_twin_job_id', jobId)
      .eq('recruiter_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch candidates with scores for this job
    // Get all role_dna_fit_scores for this job
    const { data: fitScores } = await supabase
      .from('role_dna_fit_scores')
      .select('user_id, fit_score')
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false });

    // Get shortlist scores
    const { data: shortlistScores } = await supabase
      .from('shortlist_predictive_scores')
      .select('candidate_user_id, score')
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false });

    // Get offer likelihood scores
    const { data: offerScores } = await supabase
      .from('offer_likelihood_scores')
      .select('candidate_user_id, likelihood_score')
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false });

    // Get voice interview scores
    const { data: voiceScores } = await supabase
      .from('voice_interview_sessions')
      .select('user_id, overall_score')
      .eq('job_twin_job_id', jobId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Build candidate map with latest scores
    const candidateMap = new Map<string, any>();

    fitScores?.forEach(s => {
      if (!candidateMap.has(s.user_id)) {
        candidateMap.set(s.user_id, { candidateId: s.user_id, stage: 'applied' });
      }
      if (!candidateMap.get(s.user_id).role_dna_fit_score) {
        candidateMap.get(s.user_id).role_dna_fit_score = s.fit_score;
      }
    });

    shortlistScores?.forEach(s => {
      if (!candidateMap.has(s.candidate_user_id)) {
        candidateMap.set(s.candidate_user_id, { candidateId: s.candidate_user_id, stage: 'applied' });
      }
      if (!candidateMap.get(s.candidate_user_id).shortlist_score) {
        candidateMap.get(s.candidate_user_id).shortlist_score = s.score;
      }
    });

    offerScores?.forEach(s => {
      if (!candidateMap.has(s.candidate_user_id)) {
        candidateMap.set(s.candidate_user_id, { candidateId: s.candidate_user_id, stage: 'applied' });
      }
      if (!candidateMap.get(s.candidate_user_id).offer_likelihood_score) {
        candidateMap.get(s.candidate_user_id).offer_likelihood_score = s.likelihood_score;
      }
    });

    voiceScores?.forEach(s => {
      if (!candidateMap.has(s.user_id)) {
        candidateMap.set(s.user_id, { candidateId: s.user_id, stage: 'applied' });
      }
      if (!candidateMap.get(s.user_id).voice_interview_score) {
        candidateMap.get(s.user_id).voice_interview_score = s.overall_score;
      }
    });

    const candidates = Array.from(candidateMap.values()).slice(0, 50);

    // Build AI input
    const aiInput = {
      job: {
        id: job.id,
        title: (job as any).job?.title || 'Unknown',
        seniority: (job as any).job?.seniority || 'mid',
        requirements_summary: (job as any).job?.jd_text?.substring(0, 1000) || ''
      },
      role_dna: roleDna.snapshot_json,
      pipeline_health: pipelineHealth?.snapshot_json || {
        summary: 'No pipeline health snapshot available',
        stage_distribution: [],
        bottlenecks: []
      },
      candidates
    };

    console.log('Calling AI with input:', JSON.stringify(aiInput).substring(0, 500));

    // Call LLM
    const startTime = Date.now();
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: HIRING_AUTOPILOT_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(aiInput) }
        ],
        temperature: 0.2
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const latencyMs = Date.now() - startTime;
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save snapshot
    const { data: snapshot, error: saveError } = await supabase
      .from('hiring_plan_autopilot_snapshots')
      .insert({
        job_twin_job_id: jobId,
        recruiter_user_id: user.id,
        snapshot_json: parsed
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save snapshot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'hiring_autopilot',
      created_by: user.id,
      input_ref: jobId,
      latency_ms: latencyMs,
      model_name: 'google/gemini-2.5-flash',
      output_json: parsed,
      status: 'ok'
    });

    return new Response(
      JSON.stringify({ success: true, snapshot: parsed, createdAt: snapshot.created_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Hiring autopilot error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
