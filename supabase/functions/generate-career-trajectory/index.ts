import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAREER_TRAJECTORY_SYSTEM_PROMPT = `You are a career strategist and trajectory planner for FuturHire, an AI career OS.

Your task is to analyze a candidate's profile, skills, job interactions, and interview performance to generate a comprehensive career trajectory plan.

You must:
1. Infer the candidate's current career level and positioning based on their experience, skills, and job history.
2. Propose 2-3 realistic next job titles they can aim for, with readiness scores and time estimates.
3. Build 3 distinct trajectory paths:
   - Linear Growth Path: staying in their current domain and moving up
   - Expansion/Adjacent Path: broadening into related areas
   - Career Switch/Exploration Path: pivoting to a different domain
4. Identify 3-5 breakthrough skills that would dramatically improve their prospects.
5. Create a detailed 6-month action plan with monthly themes and focus items.
6. Provide approximate salary bands using general market knowledge (India INR focus, but be aware of global trends). These are rough estimates, NOT guarantees.
7. Provide a gentle peer comparison (how they compare to typical peers at their level) and market demand narrative.

Important guidelines:
- Be honest but encouraging. Identify real gaps while highlighting genuine strengths.
- Do NOT promise exact salaries or guarantees; everything is approximate and high-level guidance.
- Use realistic time estimates based on typical career progression.
- Tailor advice to the candidate's specific background and goals.
- Return ONLY valid JSON matching the specified schema, no additional commentary or markdown.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Fetch candidate profile
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch job twin profile
    const { data: jobTwinProfile } = await supabase
      .from('job_twin_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch job twin jobs (saved/applied jobs)
    const { data: jobTwinJobs } = await supabase
      .from('job_twin_jobs')
      .select(`
        *,
        jobs:job_id (
          title,
          seniority,
          employment_type,
          location,
          remote_mode,
          tags,
          salary_range
        )
      `)
      .eq('profile_id', jobTwinProfile?.id || '')
      .limit(20);

    // Fetch applications
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        *,
        jobs:job_id (
          title,
          seniority,
          employment_type,
          location,
          tags
        )
      `)
      .eq('candidate_id', candidate?.id || '')
      .limit(20);

    // Fetch voice interview scores
    const { data: voiceInterviews } = await supabase
      .from('voice_interview_sessions')
      .select('role_title, overall_score, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Build candidate context
    const candidateContext = {
      full_name: candidate?.full_name || 'Unknown',
      headline: candidate?.headline || '',
      skills: candidate?.skills || '',
      years_experience: candidate?.years_experience || 0,
      summary: candidate?.summary || '',
      ideal_role: jobTwinProfile?.ideal_role || '',
      career_goals: jobTwinProfile?.career_goals || '',
      preferences: jobTwinProfile?.preferences || {},
      job_twin_skills: jobTwinProfile?.skills || [],
    };

    // Build job signals
    const jobSignals = [];

    if (jobTwinJobs) {
      for (const jtj of jobTwinJobs) {
        if (jtj.jobs) {
          jobSignals.push({
            source: 'job_twin',
            title: jtj.jobs.title,
            seniority: jtj.jobs.seniority,
            status: jtj.status,
            match_score: jtj.match_score,
            tags: jtj.jobs.tags,
          });
        }
      }
    }

    if (applications) {
      for (const app of applications) {
        if (app.jobs) {
          jobSignals.push({
            source: 'application',
            title: app.jobs.title,
            seniority: app.jobs.seniority,
            status: app.status,
            skill_fit_score: app.skill_fit_score,
            culture_fit_score: app.culture_fit_score,
            overall_score: app.overall_score,
          });
        }
      }
    }

    // Build interview signals
    const interviewSignals = voiceInterviews?.map(vi => ({
      role_title: vi.role_title,
      overall_score: vi.overall_score,
    })) || [];

    // Build the user prompt
    const userPrompt = `Analyze this candidate and generate a comprehensive career trajectory plan.

CANDIDATE PROFILE:
${JSON.stringify(candidateContext, null, 2)}

JOB INTERACTION SIGNALS (${jobSignals.length} jobs):
${JSON.stringify(jobSignals.slice(0, 15), null, 2)}

INTERVIEW PERFORMANCE (${interviewSignals.length} sessions):
${JSON.stringify(interviewSignals, null, 2)}

Generate a complete career trajectory analysis following this exact JSON schema:

{
  "current_position": {
    "level_label": "string (e.g. 'Engineer L2 (Mid-level)')",
    "confidence": "number 0-100",
    "one_line_summary": "string",
    "strength_highlights": ["string array"],
    "risk_or_ceiling_factors": ["string array"]
  },
  "next_roles": [
    {
      "title": "string",
      "readiness_score": "number 0-100",
      "time_estimate_months": "string (e.g. '6-18')",
      "key_gaps_to_fill": ["string array"],
      "leverage_factors": ["string array"]
    }
  ],
  "trajectories": [
    {
      "id": "linear_growth | expansion | switch",
      "label": "string",
      "description": "string",
      "stages": [
        {
          "stage_label": "string",
          "time_window_months": "string",
          "focus_areas": ["string array"]
        }
      ]
    }
  ],
  "breakthrough_skills": [
    {
      "skill_name": "string",
      "impact": "string",
      "how_to_practice": ["string array"]
    }
  ],
  "six_month_plan": {
    "summary": "string",
    "months": [
      {
        "month_index": "number 1-6",
        "theme": "string",
        "focus_items": ["string array"]
      }
    ]
  },
  "salary_projection": {
    "note": "Approximate ranges only. Not guarantees.",
    "current_band": {
      "currency": "INR",
      "annual_min": "number",
      "annual_max": "number",
      "commentary": "string"
    },
    "trajectory_bands": [
      {
        "trajectory_id": "string",
        "level_label": "string",
        "currency": "INR",
        "annual_min": "number",
        "annual_max": "number",
        "commentary": "string"
      }
    ]
  },
  "peer_comparison": {
    "narrative": "string",
    "relative_strengths": ["string array"],
    "relative_weaknesses": ["string array"]
  },
  "market_demand": {
    "narrative": "string",
    "hot_roles": ["string array"],
    "cooling_roles": ["string array"]
  }
}

Return ONLY valid JSON, no markdown or additional text.`;

    // Call LLM
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: CAREER_TRAJECTORY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to generate trajectory' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let snapshotJson;
    try {
      // Clean up potential markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      snapshotJson = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      snapshotJson = { error: 'parse_error', raw: content };
    }

    // Add metadata
    snapshotJson._metadata = {
      generated_at: new Date().toISOString(),
      candidate_data_points: {
        has_profile: !!candidate,
        has_job_twin_profile: !!jobTwinProfile,
        job_signals_count: jobSignals.length,
        interview_signals_count: interviewSignals.length,
      },
    };

    // Save to database
    const { data: snapshot, error: insertError } = await supabase
      .from('career_trajectory_snapshots')
      .insert({
        user_id: userId,
        snapshot_json: snapshotJson,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save trajectory' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      snapshot: snapshotJson,
      id: snapshot.id,
      created_at: snapshot.created_at,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Career trajectory error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
