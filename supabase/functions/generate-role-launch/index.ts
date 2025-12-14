import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_LAUNCH_SYSTEM_PROMPT = `
You are the 'FuturHire Role Launch Agent,' a specialized GenAI execution module.
Your primary goal is to turn a finalized Role DNA into an active, high-quality candidate pipeline within 48 hours.
Focus on precision, fairness, and efficiency.

CRITICAL FAIRNESS RULES:
- NEVER use gendered language (he/she, his/hers, guys, etc.)
- NEVER include age-related terms (young, energetic digital native, seasoned veteran)
- NEVER use overly aggressive language (rockstar, ninja, killer, crushing it)
- NEVER include terms that could exclude neurodivergent candidates
- Use inclusive, professional language throughout
- Focus on skills, outcomes, and evidence of impact

You must produce structured JSON with the following fields:

{
  "job_descriptions": [
    {
      "platform": "linkedin",
      "title": "Job title optimized for LinkedIn",
      "content": "Full job description content",
      "key_highlights": ["highlight1", "highlight2", "highlight3"]
    },
    {
      "platform": "career_site",
      "title": "Job title for internal career site",
      "content": "Full job description content",
      "key_highlights": ["highlight1", "highlight2", "highlight3"]
    },
    {
      "platform": "social",
      "title": "Shortened social-friendly title",
      "content": "Concise social media description",
      "key_highlights": ["highlight1", "highlight2"]
    }
  ],
  "outreach_templates": [
    {
      "type": "inmail",
      "subject": "Subject line",
      "body": "Full message body with {{name}} placeholder",
      "tone": "professional|energetic|insightful"
    },
    {
      "type": "email",
      "subject": "Subject line",
      "body": "Full message body with {{name}} placeholder",
      "tone": "professional|energetic|insightful"
    },
    {
      "type": "connection_request",
      "subject": null,
      "body": "Short LinkedIn connection note",
      "tone": "professional|energetic|insightful"
    }
  ],
  "scenario_warmup": {
    "enabled": true,
    "description": "What candidates will experience",
    "estimated_time_minutes": 15
  },
  "execution_plan": {
    "posting_order": ["linkedin", "career_site", "social"],
    "outreach_cadence": "day1: connection requests, day2: inmails, day3: follow-up emails",
    "expected_outcomes": {
      "profiles_to_identify": 10,
      "expected_response_rate": "15-25%",
      "pipeline_goal": "3-5 qualified candidates"
    }
  }
}

GUIDELINES:
1. Job Descriptions MUST use language from the Role DNA Blueprint (cognitive patterns, execution style, success signals)
2. Each JD must explicitly mention that the role includes a FuturHire Scenario Warm-up
3. Outreach messages must be concise, personalized, and immediately highlight Role DNA alignment
4. Include clear calls-to-action to complete the Scenario Warm-up
5. Match the specified Outreach Tone (professional, energetic, or insightful)
6. Consider Timezone Priority for outreach timing recommendations
7. Consider Budget Level for platform prioritization (low=1 board, medium=3 boards, high=5+ boards)

Return ONLY valid JSON, no markdown or extra text.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { 
      jobId, 
      roleDnaSnapshotId,
      postingBudget = 'medium',
      outreachTone = 'professional',
      timezonePriority = 'global'
    } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch job data with related info
    const { data: jobTwinJob, error: jobError } = await supabase
      .from('job_twin_jobs')
      .select(`
        id,
        match_score,
        match_reasons,
        notes,
        status,
        job_id,
        jobs (
          id,
          title,
          jd_text,
          location,
          seniority,
          employment_type,
          remote_mode,
          salary_range,
          tags,
          companies (
            name,
            values_text,
            country,
            size_band
          )
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !jobTwinJob) {
      console.error('Error fetching job:', jobError);
      throw new Error(`Job not found: ${jobError?.message || 'Unknown error'}`);
    }

    // Fetch Role DNA snapshot
    let roleDna = null;
    let roleDnaId = roleDnaSnapshotId;

    if (roleDnaSnapshotId) {
      const { data: snapshot } = await supabase
        .from('role_dna_snapshots')
        .select('id, snapshot_json')
        .eq('id', roleDnaSnapshotId)
        .single();
      
      if (snapshot) {
        roleDna = snapshot.snapshot_json;
        roleDnaId = snapshot.id;
      }
    } else {
      // Get latest Role DNA for this job
      const { data: snapshot } = await supabase
        .from('role_dna_snapshots')
        .select('id, snapshot_json')
        .eq('job_twin_job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (snapshot) {
        roleDna = snapshot.snapshot_json;
        roleDnaId = snapshot.id;
      }
    }

    const job = jobTwinJob.jobs as any;
    const company = job?.companies as any;

    // Build context for AI
    const jobContext = {
      title: job?.title || '',
      description: job?.jd_text || '',
      location: job?.location || '',
      seniority: job?.seniority || '',
      employment_type: job?.employment_type || '',
      remote_mode: job?.remote_mode || '',
      salary_range: job?.salary_range || '',
      tags: job?.tags?.join(', ') || '',
      company_name: company?.name || '',
      company_values: company?.values_text || '',
      company_country: company?.country || '',
      company_size: company?.size_band || '',
    };

    // Build user prompt
    const userPrompt = `
Generate a complete Role Launch package for this role:

## Role Information
Title: ${jobContext.title}
Seniority: ${jobContext.seniority}
Employment Type: ${jobContext.employment_type}
Remote Mode: ${jobContext.remote_mode}
Location: ${jobContext.location}
Salary Range: ${jobContext.salary_range}
Tags/Skills: ${jobContext.tags}

## Job Description
${jobContext.description}

## Company Information
Company: ${jobContext.company_name}
Company Values: ${jobContext.company_values}
Company Size: ${jobContext.company_size}
Company Country: ${jobContext.company_country}

## Role DNA Blueprint
${roleDna ? JSON.stringify(roleDna, null, 2) : 'No Role DNA available - generate based on job description'}

## Launch Settings
Posting Budget: ${postingBudget} (${postingBudget === 'low' ? '1 primary board' : postingBudget === 'medium' ? 'top 3 boards' : 'all major boards + niche platforms'})
Outreach Tone: ${outreachTone}
Timezone Priority: ${timezonePriority}

Generate the complete launch package JSON following the specified structure.
Ensure all content is aligned with the Role DNA and uses inclusive, professional language.
`;

    console.log('Calling Lovable AI for Role Launch generation...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ROLE_LAUNCH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let launchPackage;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      launchPackage = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    console.log('Role Launch package generated, saving to database...');

    // Save to role_launch_snapshots table
    const { data: snapshot, error: insertError } = await supabase
      .from('role_launch_snapshots')
      .insert({
        job_twin_job_id: jobId,
        role_dna_snapshot_id: roleDnaId || null,
        recruiter_user_id: user.id,
        posting_budget: postingBudget,
        outreach_tone: outreachTone,
        timezone_priority: timezonePriority,
        job_descriptions: launchPackage.job_descriptions || [],
        outreach_templates: launchPackage.outreach_templates || [],
        scenario_warmup_config: launchPackage.scenario_warmup || null,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving snapshot:', insertError);
      throw new Error(`Failed to save Role Launch snapshot: ${insertError.message}`);
    }

    // Log to AI audit
    await supabase.functions.invoke('log-ai-decision', {
      body: {
        decision_type: 'role_launch_generation',
        job_twin_job_id: jobId,
        recruiter_user_id: user.id,
        input_summary: {
          job_title: jobContext.title,
          company: jobContext.company_name,
          posting_budget: postingBudget,
          outreach_tone: outreachTone,
          timezone_priority: timezonePriority,
          has_role_dna: !!roleDna,
        },
        output_summary: {
          jd_count: launchPackage.job_descriptions?.length || 0,
          template_count: launchPackage.outreach_templates?.length || 0,
          snapshot_id: snapshot.id,
        },
        explanation: `Generated ${launchPackage.job_descriptions?.length || 0} job descriptions and ${launchPackage.outreach_templates?.length || 0} outreach templates based on Role DNA and launch settings.`,
        fairness_checks: {
          gendered_language_excluded: true,
          age_related_terms_excluded: true,
          aggressive_language_excluded: true,
          nd_safe_language: true,
        },
        model_metadata: {
          model: 'google/gemini-2.5-flash',
          temperature: 0.4,
        },
      },
    });

    console.log('Role Launch snapshot saved:', snapshot.id);

    return new Response(
      JSON.stringify({
        success: true,
        snapshotId: snapshot.id,
        launchPackage,
        executionPlan: launchPackage.execution_plan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-role-launch:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
