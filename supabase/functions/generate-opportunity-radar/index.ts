import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPPORTUNITY_RADAR_SYSTEM_PROMPT = `You are a career strategist and opportunity mapper for an AI job platform called FuturHire. Your job is to:
- Analyze a candidate's profile and the set of jobs they have interacted with.
- Group these jobs into 3–5 role families (e.g. Frontend Engineer, Product Engineer, Customer Success, etc.).
- For each role family, rate how strong the candidate currently is (0–100), and whether they are ready now, almost there, or it's a stretch.
- Explain *why* they are a fit or not (based on skills, experience, interview scores).
- Identify 1–3 skills or focus areas that would unlock significantly more opportunities for them.
- You must be realistic, encouraging, and practical. Focus on evidence from the data provided, not imagination.
Return ONLY valid JSON matching the specified schema. Do not include any extra commentary or natural language outside the JSON.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating opportunity radar for user: ${user.id}`);

    // 1. Fetch candidate profile
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch job twin profile for preferences
    const { data: jobTwinProfile } = await supabase
      .from('job_twin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Fetch jobs from job_twin_jobs (jobs the candidate has saved/applied to)
    let jobTwinJobs: any[] = [];
    if (jobTwinProfile) {
      const { data: jtJobs } = await supabase
        .from('job_twin_jobs')
        .select(`
          *,
          jobs:job_id (
            id, title, location, seniority, jd_text, tags,
            companies:company_id (name)
          )
        `)
        .eq('profile_id', jobTwinProfile.id);
      
      if (jtJobs) {
        jobTwinJobs = jtJobs;
      }
    }

    // 4. Fetch applications the candidate has made
    let applicationJobs: any[] = [];
    if (candidateData) {
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          *,
          jobs:job_id (
            id, title, location, seniority, jd_text, tags,
            companies:company_id (name)
          )
        `)
        .eq('candidate_id', candidateData.id);
      
      if (apps) {
        applicationJobs = apps;
      }
    }

    // 5. Fetch voice interview scores
    const { data: voiceInterviews } = await supabase
      .from('voice_interview_sessions')
      .select('*')
      .eq('user_id', user.id)
      .not('overall_score', 'is', null);

    // Build candidate profile for AI
    const candidateProfile = {
      headline: candidateData?.headline || '',
      years_experience: candidateData?.years_experience || 0,
      skills: candidateData?.skills ? candidateData.skills.split(',').map((s: string) => s.trim()) : 
              (jobTwinProfile?.skills || []),
      preferred_roles: jobTwinProfile?.ideal_role ? [jobTwinProfile.ideal_role] : [],
      career_goals: jobTwinProfile?.career_goals || '',
      short_summary: candidateData?.summary || ''
    };

    // Build jobs array for AI
    const processedJobIds = new Set<string>();
    const jobsForAI: any[] = [];

    // Process job twin jobs
    for (const jtJob of jobTwinJobs) {
      if (!jtJob.jobs || processedJobIds.has(jtJob.jobs.id)) continue;
      processedJobIds.add(jtJob.jobs.id);
      
      jobsForAI.push({
        id: jtJob.jobs.id,
        title: jtJob.jobs.title,
        company: jtJob.jobs.companies?.name || 'Unknown',
        location: jtJob.jobs.location,
        seniority: jtJob.jobs.seniority,
        requirements: jtJob.jobs.jd_text?.substring(0, 1000) || '',
        tags: jtJob.jobs.tags || [],
        existing_scores: {
          job_fit_score: jtJob.match_score || null,
          status: jtJob.status
        }
      });
    }

    // Process application jobs
    for (const app of applicationJobs) {
      if (!app.jobs || processedJobIds.has(app.jobs.id)) continue;
      processedJobIds.add(app.jobs.id);
      
      jobsForAI.push({
        id: app.jobs.id,
        title: app.jobs.title,
        company: app.jobs.companies?.name || 'Unknown',
        location: app.jobs.location,
        seniority: app.jobs.seniority,
        requirements: app.jobs.jd_text?.substring(0, 1000) || '',
        tags: app.jobs.tags || [],
        existing_scores: {
          job_fit_score: app.overall_score || null,
          skill_fit: app.skill_fit_score || null,
          culture_fit: app.culture_fit_score || null,
          status: app.status
        }
      });
    }

    // Add voice interview scores
    const voiceInterviewScores = voiceInterviews?.map(vi => ({
      role_title: vi.role_title,
      overall_score: vi.overall_score,
      difficulty: vi.difficulty
    })) || [];

    // Build user prompt
    const userPrompt = `Analyze this candidate and their job interactions to create an opportunity radar.

CANDIDATE PROFILE:
${JSON.stringify(candidateProfile, null, 2)}

JOBS INTERACTED WITH (${jobsForAI.length} jobs):
${JSON.stringify(jobsForAI.slice(0, 20), null, 2)}

VOICE INTERVIEW PRACTICE SCORES:
${JSON.stringify(voiceInterviewScores, null, 2)}

REQUIRED OUTPUT SCHEMA:
{
  "role_families": [
    {
      "id": "unique_snake_case_id",
      "label": "Role Family Name (e.g. Frontend Engineer)",
      "score": 0-100,
      "readiness": "ready_now" | "almost_there" | "stretch",
      "why_fit": ["reason 1", "reason 2"],
      "key_gaps": ["gap 1", "gap 2"],
      "recommended_skills_to_focus": ["skill 1", "skill 2"],
      "related_job_ids": ["job-uuid-1"]
    }
  ],
  "skill_leverage_insight": [
    {
      "skill_name": "Skill Name",
      "impact_summary": "How this skill unlocks opportunities",
      "suggested_actions": ["action 1", "action 2"]
    }
  ],
  "global_commentary": {
    "overall_positioning": "Summary of where candidate stands",
    "short_term_opportunity": "What to focus on in next 1-3 months",
    "long_term_opportunity": "Career growth trajectory"
  }
}

${jobsForAI.length < 3 ? 'Note: Limited job data available. Provide general guidance based on profile.' : ''}

Return ONLY the JSON object, no other text.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling AI with candidate data...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: OPPORTUNITY_RADAR_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI response received, parsing...');

    // Parse JSON response
    let snapshotJson: any;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      snapshotJson = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      snapshotJson = {
        error: 'Failed to parse AI response',
        raw_response: aiContent.substring(0, 500),
        role_families: [],
        skill_leverage_insight: [],
        global_commentary: {
          overall_positioning: 'Unable to generate analysis. Please try again.',
          short_term_opportunity: '',
          long_term_opportunity: ''
        }
      };
    }

    // Add metadata
    snapshotJson.metadata = {
      generated_at: new Date().toISOString(),
      jobs_analyzed: jobsForAI.length,
      has_profile: !!candidateData,
      has_job_twin_profile: !!jobTwinProfile
    };

    // Save snapshot to database
    const { data: savedSnapshot, error: saveError } = await supabase
      .from('opportunity_radar_snapshots')
      .insert({
        user_id: user.id,
        snapshot_json: snapshotJson
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving snapshot:', saveError);
      throw new Error('Failed to save snapshot');
    }

    console.log('Snapshot saved successfully:', savedSnapshot.id);

    return new Response(JSON.stringify({
      success: true,
      snapshot: snapshotJson,
      id: savedSnapshot.id,
      created_at: savedSnapshot.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-opportunity-radar:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
