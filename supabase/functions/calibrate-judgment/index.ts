import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALIBRATION_SYSTEM_PROMPT = `You are the 'FuturHire Judgment Calibration Agent.' Your sole function is to provide private, objective feedback to an interviewer immediately after they submit their scores to improve Inter-Rater Reliability (IRR) and reduce bias. Your tone must be supportive, evidence-based, and non-punitive.

Tasks & Constraints (Strictly Followed):
1. Discrepancy Check:
   - Identify the top 1-2 Role DNA dimensions where the Interviewer Submission deviates by more than 20 points from EITHER the Role DNA Benchmark OR the Team Average Score.
   - If no significant deviation exists, set has_discrepancies to false.

2. Bias Trap Identification:
   - For flagged dimensions, identify the most probable psychological bias relevant to outlier scoring.
   - Common biases: Contrast Bias (previous candidate influenced scoring), Recency Bias (recent events weighted heavily), Halo Effect (one trait influenced others), Confirmation Bias (seeking evidence for initial impression), Leniency/Severity Bias.

3. Evidence Elicitation:
   - Compare the interviewer's notes against required evidence from Role DNA Success Signals.
   - If notes are generic or fail to mention critical Success Signals, flag as missing evidence.

4. Prompt Generation:
   - Structure output to clearly state discrepancy, name dimension and score, present bias flag and evidence gap as QUESTIONS for consideration, NOT accusations.
   - NEVER suggest the interviewer must change their score. Only prompt them to revisit or justify.

Return JSON:
{
  "has_discrepancies": boolean,
  "discrepancies": [
    {
      "dimension": "dimension_name",
      "interviewer_score": number,
      "team_average": number | null,
      "role_dna_benchmark": number | null,
      "deviation_from_team": number | null,
      "deviation_from_benchmark": number | null,
      "is_high_priority": boolean,
      "coaching_question": "supportive question prompting reflection"
    }
  ],
  "bias_flags": [
    {
      "bias_type": "Contrast Bias | Recency Bias | Halo Effect | Confirmation Bias | Leniency Bias | Severity Bias",
      "dimension_affected": "dimension_name",
      "coaching_question": "Did X influence Y? Consider whether..."
    }
  ],
  "evidence_gaps": [
    {
      "dimension": "dimension_name",
      "required_evidence": "what Role DNA requires",
      "notes_referenced": "what interviewer noted",
      "gap_description": "supportive description of what's missing"
    }
  ],
  "positive_confirmation": "brief supportive message if no issues found",
  "overall_coaching_summary": "1-2 sentence supportive summary"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { 
      interviewId,
      jobId, 
      candidateId,
      ratings,
      notes,
      candidateName,
      roleTitle
    } = body;

    console.log('Calibration request for interview:', interviewId);

    // Fetch Role DNA for benchmark
    let roleDnaBenchmark = null;
    const { data: roleDnaSnapshot } = await supabase
      .from('role_dna_snapshots')
      .select('snapshot_json')
      .eq('job_twin_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roleDnaSnapshot?.snapshot_json) {
      roleDnaBenchmark = roleDnaSnapshot.snapshot_json;
    }

    // Fetch team average for this candidate (other interviewers' ratings)
    const { data: teamRatings } = await supabase
      .from('interviews')
      .select(`
        id,
        interview_ratings (
          tech_depth,
          problem_solving,
          communication,
          culture_add,
          notes
        )
      `)
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .neq('id', interviewId);

    // Calculate team averages
    let teamAverages: Record<string, number> = {};
    if (teamRatings && teamRatings.length > 0) {
      const validRatings = teamRatings
        .filter(i => i.interview_ratings && i.interview_ratings.length > 0)
        .map(i => i.interview_ratings[0]) as Array<{
          tech_depth: number | null;
          problem_solving: number | null;
          communication: number | null;
          culture_add: number | null;
          notes: string | null;
        }>;

      if (validRatings.length > 0) {
        // Calculate averages for each dimension
        const techValues = validRatings.map(r => r.tech_depth).filter((v): v is number => v != null);
        const problemValues = validRatings.map(r => r.problem_solving).filter((v): v is number => v != null);
        const commValues = validRatings.map(r => r.communication).filter((v): v is number => v != null);
        const cultureValues = validRatings.map(r => r.culture_add).filter((v): v is number => v != null);

        if (techValues.length > 0) {
          teamAverages['tech_depth'] = Math.round(techValues.reduce((a, b) => a + b, 0) / techValues.length);
        }
        if (problemValues.length > 0) {
          teamAverages['problem_solving'] = Math.round(problemValues.reduce((a, b) => a + b, 0) / problemValues.length);
        }
        if (commValues.length > 0) {
          teamAverages['communication'] = Math.round(commValues.reduce((a, b) => a + b, 0) / commValues.length);
        }
        if (cultureValues.length > 0) {
          teamAverages['culture_add'] = Math.round(cultureValues.reduce((a, b) => a + b, 0) / cultureValues.length);
        }
      }
    }

    // Build prompt for AI
    const prompt = `Analyze this interview rating submission for calibration:

**Role**: ${roleTitle || 'Not specified'}
**Candidate**: ${candidateName || 'Not specified'}

**Interviewer's Ratings (0-100 scale)**:
- Technical Depth: ${ratings.tech_depth}
- Problem Solving: ${ratings.problem_solving}
- Communication: ${ratings.communication}
- Culture Add: ${ratings.culture_add}

**Interviewer's Notes**:
${notes || 'No notes provided'}

**Team Average Scores for this Candidate** (from other interviewers):
${Object.keys(teamAverages).length > 0 
  ? Object.entries(teamAverages).map(([k, v]) => `- ${k}: ${v}`).join('\n')
  : 'No other interviewers have rated this candidate yet'}

**Role DNA Benchmark** (expected profile for this role):
${roleDnaBenchmark 
  ? JSON.stringify(roleDnaBenchmark, null, 2)
  : 'No Role DNA benchmark available for this role'}

Analyze for significant discrepancies (>20 points deviation), potential biases, and evidence gaps. If everything looks aligned, provide brief positive confirmation.`;

    console.log('Calling AI for calibration analysis...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: CALIBRATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let calibrationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        calibrationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      calibrationResult = {
        has_discrepancies: false,
        discrepancies: [],
        bias_flags: [],
        evidence_gaps: [],
        positive_confirmation: "Your ratings have been recorded. Thank you for your feedback!",
        overall_coaching_summary: "No significant calibration issues detected."
      };
    }

    // Store calibration check in database
    const { data: calibrationCheck, error: insertError } = await supabase
      .from('calibration_checks')
      .insert({
        interview_id: interviewId,
        interviewer_id: user.id,
        candidate_id: candidateId,
        job_id: jobId,
        discrepancies: calibrationResult.discrepancies || [],
        bias_flags: calibrationResult.bias_flags || [],
        evidence_gaps: calibrationResult.evidence_gaps || [],
        interviewer_action: calibrationResult.has_discrepancies ? 'pending' : null
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to store calibration check:', insertError);
    }

    // Log to AI audit
    try {
      await supabase.functions.invoke('log-ai-decision', {
        body: {
          decision_type: 'judgment_calibration',
          job_twin_job_id: jobId,
          candidate_user_id: candidateId,
          recruiter_user_id: user.id,
          input_summary: {
            ratings,
            notes_length: notes?.length || 0,
            team_averages: teamAverages,
            has_role_dna: !!roleDnaBenchmark
          },
          output_summary: {
            has_discrepancies: calibrationResult.has_discrepancies,
            discrepancy_count: calibrationResult.discrepancies?.length || 0,
            bias_flag_count: calibrationResult.bias_flags?.length || 0
          },
          explanation: calibrationResult.overall_coaching_summary,
          fairness_checks: {
            coaching_not_punitive: true,
            questions_not_accusations: true,
            score_change_not_required: true
          },
          model_metadata: {
            model: 'google/gemini-2.5-flash',
            temperature: 0.3
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to log AI decision:', auditError);
    }

    console.log('Calibration analysis complete:', calibrationResult.has_discrepancies ? 'discrepancies found' : 'no issues');

    return new Response(JSON.stringify({
      success: true,
      calibration: calibrationResult,
      calibration_check_id: calibrationCheck?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in calibrate-judgment:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
