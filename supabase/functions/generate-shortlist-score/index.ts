import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHORTLIST_SYSTEM_PROMPT = `You are an expert hiring strategist.

Your task:
Compute a **single Shortlist Predictive Score (0–100)** that predicts how promising a candidate is for this role.

Base your evaluation on:
- Role DNA alignment (if available)
- Decision Room cluster placement (Top Match > Promising > Wildcard)
- Candidate's work history, skills, and experience alignment
- Interview signals (if available)
- Non-linear career paths should NOT be penalized
- Neurodivergent communication styles are NOT to be judged negatively
- Ignore irrelevant factors (gender, ethnicity, age, location unless job-specific)

The output must be valid JSON:

{
  "score": <number between 0 and 100>,
  "reasoning": {
    "role_dna_alignment_weight": "<brief explanation of how Role DNA Fit influenced the score>",
    "decision_room_cluster_weight": "<brief explanation of cluster placement impact>",
    "experience_alignment_weight": "<brief explanation of experience/skills match>",
    "interview_signal_weight": "<brief explanation of interview performance if available, or 'No interview data'>",
    "final_summary": "<2-4 sentence recruiter-friendly explanation of the score>"
  }
}

Important:
- Be fair, encouraging, and evidence-based.
- Do NOT include any protected attribute inference.
- Use supportive language: "promising signals" instead of "good fit", "growth areas" instead of "weaknesses".
- Return ONLY valid JSON, no additional text.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, jobId } = await req.json();

    if (!candidateId || !jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'candidateId and jobId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch candidate profile
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, user_id, full_name, headline, skills, years_experience, summary')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate not found:', candidateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Candidate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch latest Decision Room snapshot for this job
    const { data: snapshot, error: snapshotError } = await supabase
      .from('job_decision_snapshots')
      .select('id, snapshot_json, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError || !snapshot) {
      console.error('Decision Room snapshot not found:', snapshotError);
      return new Response(
        JSON.stringify({ success: false, error: 'Decision Room snapshot not found. Generate a Decision Room analysis first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const snapshotData = snapshot.snapshot_json as any;
    
    // Find candidate in the snapshot
    const candidateEvaluation = snapshotData.candidates?.find((c: any) => c.candidate_id === candidateId);
    
    // Find which cluster the candidate belongs to
    let candidateCluster = 'Unknown';
    for (const cluster of snapshotData.clusters || []) {
      if (cluster.candidate_ids?.includes(candidateId)) {
        candidateCluster = cluster.name;
        break;
      }
    }

    // 3. Fetch latest Role DNA Fit for this candidate and job
    const { data: roleDnaFit } = await supabase
      .from('role_dna_fit_scores')
      .select('fit_score, fit_dimension_scores, summary')
      .eq('user_id', candidateId)
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 4. Fetch latest voice interview for this candidate related to this job
    const { data: voiceInterview } = await supabase
      .from('voice_interview_sessions')
      .select('overall_score, dimension_scores, strengths, improvement_areas')
      .eq('candidate_id', candidateId)
      .eq('status', 'evaluated')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build the AI input context
    const aiInput = {
      candidate_profile: {
        name: candidate.full_name,
        headline: candidate.headline || 'Not provided',
        skills: candidate.skills || 'Not provided',
        years_experience: candidate.years_experience || 'Not provided',
        summary: candidate.summary || 'Not provided'
      },
      decision_room: {
        cluster: candidateCluster,
        summary: candidateEvaluation?.summary || 'No evaluation available',
        overall_fit_score: candidateEvaluation?.overall_fit_score || null,
        risks: candidateEvaluation?.risks || [],
        strengths: candidateEvaluation?.strengths || [],
        recommended_next_step: candidateEvaluation?.recommended_next_action || 'Not specified'
      },
      role_dna_fit: roleDnaFit ? {
        fit_score: roleDnaFit.fit_score,
        dimension_scores: roleDnaFit.fit_dimension_scores || {},
        strengths: (roleDnaFit.fit_dimension_scores as any)?.strengths || [],
        gaps: (roleDnaFit.fit_dimension_scores as any)?.gaps || []
      } : null,
      interview_signals: voiceInterview ? {
        voice_interview_score: voiceInterview.overall_score,
        dimension_scores: voiceInterview.dimension_scores || {},
        notable_strengths: voiceInterview.strengths || [],
        notable_gaps: voiceInterview.improvement_areas || []
      } : null
    };

    console.log('Generating shortlist score for candidate:', candidateId, 'job:', jobId);
    console.log('AI Input:', JSON.stringify(aiInput, null, 2));

    // 5. Call the LLM
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SHORTLIST_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(aiInput) }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    let parsedResult;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    const score = Math.max(0, Math.min(100, Math.round(parsedResult.score)));
    const reasoning = parsedResult.reasoning;

    // 6. Insert into shortlist_predictive_scores
    const { data: insertedScore, error: insertError } = await supabase
      .from('shortlist_predictive_scores')
      .insert({
        user_id: candidateId,
        job_twin_job_id: jobId,
        role_dna_fit_id: roleDnaFit ? (await supabase
          .from('role_dna_fit_scores')
          .select('id')
          .eq('user_id', candidateId)
          .eq('job_twin_job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()).data?.id : null,
        decision_room_snapshot_id: snapshot.id,
        score: score,
        reasoning_json: reasoning
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert shortlist score:', insertError);
      throw new Error('Failed to save shortlist score');
    }

    console.log('Shortlist score generated:', score);

    return new Response(
      JSON.stringify({
        success: true,
        score: score,
        reasoning: reasoning,
        id: insertedScore.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-shortlist-score:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
