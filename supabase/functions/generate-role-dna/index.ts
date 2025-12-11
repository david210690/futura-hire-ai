import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_DNA_SYSTEM_PROMPT = `
You are an expert organizational psychologist and hiring strategist.
Your task: analyze a job and derive its deeper "Role DNA".

You must produce structured JSON with the following fields:

{
  "cognitive_patterns": [
    "example: ambiguity-tolerant, systems thinker, iterative problem solver"
  ],
  "communication_style": {
    "style": "example: low-context, explicit, async-friendly",
    "expectations": [
      "example: clear PRD reading, proactive updates, crisp written summaries"
    ]
  },
  "execution_style": {
    "delivery_mode": "example: rapid prototyping, design-first, rigorous QA",
    "decision_making": "example: autonomous / collaborative / data-dependent",
    "ownership_expectations": [
      "example: end-to-end ownership, stakeholder alignment"
    ]
  },
  "problem_solving_vectors": [
    "example: algorithmic reasoning, systems thinking, UI/UX intuition"
  ],
  "culture_alignment": {
    "environment": "example: move fast, regulated, consensus-driven",
    "values_expected": [
      "example: resilience, curiosity, reliability"
    ]
  },
  "success_signals": {
    "resume_signals": [
      "example: shipped production features, startup experience"
    ],
    "interview_signals": [
      "example: strong clarity, proactive thinking, ability to handle vague prompts"
    ]
  }
}

Rules:
- Stay strictly within the provided job content.
- Do NOT invent company-specific details.
- Provide only evidence-based insights.
- Return ONLY valid JSON, no markdown or extra text.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, recruiterUserId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    if (!recruiterUserId) {
      throw new Error('recruiterUserId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job data from job_twin_jobs with related job details
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

    const job = jobTwinJob.jobs as any;
    const company = job?.companies as any;

    // Build job context for AI
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
      match_reasons: jobTwinJob.match_reasons?.join(', ') || '',
      notes: jobTwinJob.notes || '',
    };

    // Build user prompt
    const userPrompt = `
Analyze this job and produce its Role DNA:

Title: ${jobContext.title}
Seniority: ${jobContext.seniority}
Employment Type: ${jobContext.employment_type}
Remote Mode: ${jobContext.remote_mode}
Location: ${jobContext.location}
Salary Range: ${jobContext.salary_range}
Tags/Skills: ${jobContext.tags}

Job Description:
${jobContext.description}

Company: ${jobContext.company_name}
Company Values: ${jobContext.company_values}
Company Size: ${jobContext.company_size}
Company Country: ${jobContext.company_country}

Additional Context:
Match Reasons: ${jobContext.match_reasons}
Notes: ${jobContext.notes}

Based on the above, generate the Role DNA JSON.
`;

    console.log('Calling Lovable AI for Role DNA generation...');

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
          { role: 'system', content: ROLE_DNA_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
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
    let roleDna;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      roleDna = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    console.log('Role DNA generated successfully, saving to database...');

    // Save to role_dna_snapshots table
    const { data: snapshot, error: insertError } = await supabase
      .from('role_dna_snapshots')
      .insert({
        job_twin_job_id: jobId,
        generated_by_user_id: recruiterUserId,
        snapshot_json: roleDna,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving snapshot:', insertError);
      throw new Error(`Failed to save Role DNA snapshot: ${insertError.message}`);
    }

    console.log('Role DNA snapshot saved:', snapshot.id);

    return new Response(
      JSON.stringify({
        success: true,
        snapshotId: snapshot.id,
        roleDna,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-role-dna:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
