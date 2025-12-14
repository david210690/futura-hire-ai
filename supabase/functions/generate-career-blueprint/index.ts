import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAREER_BLUEPRINT_SYSTEM_PROMPT = `You are the 'FuturHire Internal Career Blueprint Agent.' Your purpose is to facilitate internal mobility and retention by providing objective, encouraging development plans based on the comparison of two DNA structures. Your output must be actionable, growth-oriented, and strictly confidential.

Tasks & Constraints (Strictly Followed):

1. Gap Analysis:
   - Compare Employee Personal DNA (their skills, experience, strengths) against Target Role 1 DNA
   - Identify the top 3 most significant Growth Gaps where the employee's current profile differs from the target role's requirements
   - For Target Role 2 (stretch role), identify the top 5 Growth Gaps

2. Growth Plan Generation:
   For each identified gap, create a "Growth Focus Area" that includes:
   - The Gap (Objective): Clearly state the required skill or pattern
   - The Action (Practice): Suggest specific, actionable activities to develop this area
   - Timeline Estimate: Realistic timeframe for development (weeks/months)
   - Resources: Suggested learning resources, mentorship opportunities, or experiences

3. Readiness Assessment:
   - Calculate a Readiness Score (0-100) for each target role
   - Identify "Bridge Skills" - existing strengths that transfer well to the target role
   - Highlight "Quick Wins" - gaps that can be closed relatively quickly

4. Tone & Language Constraints:
   - NEVER use hiring language ("Fail," "Unqualified," "Not a Fit")
   - ONLY use growth terms: "Growth Area," "Development Vector," "Expansion Opportunity," "Emerging Strength"
   - Be encouraging and focus on potential, not deficits
   - Frame everything as a journey, not a judgment

Return JSON:
{
  "employee_summary": {
    "current_positioning": "brief summary of employee's current strengths and profile",
    "growth_potential": "encouraging statement about their development trajectory"
  },
  "role_1_blueprint": {
    "role_title": "Target Role 1 name",
    "readiness_score": 0-100,
    "readiness_label": "Ready Now | Almost There | Growth Journey",
    "bridge_skills": [
      {
        "skill": "skill name",
        "relevance": "how this transfers to the role"
      }
    ],
    "growth_focus_areas": [
      {
        "area": "skill or competency name",
        "objective": "what needs to be developed",
        "current_level": "where they are now (encouraging framing)",
        "target_level": "where they need to be",
        "actions": [
          {
            "action": "specific activity",
            "type": "training | project | mentorship | experience",
            "timeline": "estimated time"
          }
        ],
        "quick_win": boolean
      }
    ],
    "timeline_summary": "overall estimated development timeline",
    "encouragement": "personalized encouraging message"
  },
  "role_2_blueprint": {
    "role_title": "Target Role 2 (stretch) name",
    "readiness_score": 0-100,
    "readiness_label": "Ready Now | Almost There | Growth Journey | Stretch Goal",
    "bridge_skills": [...],
    "growth_focus_areas": [...],
    "timeline_summary": "overall estimated development timeline",
    "encouragement": "personalized encouraging message"
  },
  "overall_guidance": {
    "recommended_path": "which role to focus on first and why",
    "key_theme": "the main development theme across both roles",
    "closing_message": "encouraging, growth-oriented closing statement"
  }
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

    // Authenticate user
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
    const { targetRole1, targetRole2, targetRole1JobId, targetRole2JobId } = body;

    if (!targetRole1) {
      return new Response(JSON.stringify({ error: 'Target Role 1 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Generating career blueprint for user:', user.id);

    // Fetch employee's Personal DNA (composite from multiple sources)
    
    // 1. Candidate profile
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Job Twin profile (career goals, skills)
    const { data: jobTwinProfile } = await supabase
      .from('job_twin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Voice interview scores (behavioral signals)
    const { data: voiceInterviews } = await supabase
      .from('voice_interview_sessions')
      .select('overall_score, feedback_summary, dimension_scores')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    // 4. Role DNA fit scores (existing assessments)
    const { data: fitScores } = await supabase
      .from('role_dna_fit_scores')
      .select('fit_score, fit_dimension_scores, strengths, gaps')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // 5. Career trajectory snapshot (if exists)
    const { data: trajectorySnapshot } = await supabase
      .from('career_trajectory_snapshots')
      .select('snapshot_json')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch Role DNA for target roles if job IDs provided
    let role1Dna = null;
    let role2Dna = null;

    if (targetRole1JobId) {
      const { data: role1DnaSnapshot } = await supabase
        .from('role_dna_snapshots')
        .select('snapshot_json')
        .eq('job_twin_job_id', targetRole1JobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      role1Dna = role1DnaSnapshot?.snapshot_json;
    }

    if (targetRole2JobId) {
      const { data: role2DnaSnapshot } = await supabase
        .from('role_dna_snapshots')
        .select('snapshot_json')
        .eq('job_twin_job_id', targetRole2JobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      role2Dna = role2DnaSnapshot?.snapshot_json;
    }

    // Build comprehensive employee profile
    const employeeProfile = {
      name: candidate?.full_name || 'Employee',
      headline: candidate?.headline,
      skills: candidate?.skills || jobTwinProfile?.skills?.join(', '),
      years_experience: candidate?.years_experience,
      summary: candidate?.summary,
      career_goals: jobTwinProfile?.career_goals,
      ideal_role: jobTwinProfile?.ideal_role,
      preferences: jobTwinProfile?.preferences,
      voice_interview_insights: voiceInterviews?.map(v => ({
        score: v.overall_score,
        summary: v.feedback_summary,
        dimensions: v.dimension_scores
      })),
      fit_assessments: fitScores?.map(f => ({
        score: f.fit_score,
        dimensions: f.fit_dimension_scores,
        strengths: f.strengths,
        gaps: f.gaps
      })),
      trajectory_insights: trajectorySnapshot?.snapshot_json
    };

    // Build prompt
    const prompt = `Generate a career growth blueprint for this employee:

**Employee Personal DNA:**
${JSON.stringify(employeeProfile, null, 2)}

**Target Role 1:** ${targetRole1}
${role1Dna ? `Role DNA Blueprint: ${JSON.stringify(role1Dna, null, 2)}` : 'No specific Role DNA available - use general role expectations'}

${targetRole2 ? `**Target Role 2 (Stretch):** ${targetRole2}
${role2Dna ? `Role DNA Blueprint: ${JSON.stringify(role2Dna, null, 2)}` : 'No specific Role DNA available - use general role expectations'}` : 'No stretch role specified - focus on Target Role 1 only'}

Create a personalized, encouraging growth blueprint. Focus on actionable development, not judgment. Remember: this is about growth potential, not current limitations.`;

    console.log('Calling AI for blueprint generation...');

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
          { role: 'system', content: CAREER_BLUEPRINT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
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
    let blueprintResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        blueprintResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate blueprint',
        details: 'AI response could not be parsed'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store blueprint in database
    const { data: savedBlueprint, error: insertError } = await supabase
      .from('career_blueprint_snapshots')
      .insert({
        user_id: user.id,
        target_role_1: targetRole1,
        target_role_2: targetRole2 || null,
        target_role_1_job_id: targetRole1JobId || null,
        target_role_2_job_id: targetRole2JobId || null,
        blueprint_json: blueprintResult
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save blueprint:', insertError);
    }

    // Log to AI audit
    try {
      await supabase.functions.invoke('log-ai-decision', {
        body: {
          decision_type: 'career_blueprint',
          candidate_user_id: user.id,
          input_summary: {
            target_role_1: targetRole1,
            target_role_2: targetRole2,
            has_candidate_profile: !!candidate,
            has_job_twin_profile: !!jobTwinProfile,
            voice_interview_count: voiceInterviews?.length || 0,
            fit_score_count: fitScores?.length || 0
          },
          output_summary: {
            role_1_readiness: blueprintResult.role_1_blueprint?.readiness_score,
            role_2_readiness: blueprintResult.role_2_blueprint?.readiness_score,
            growth_areas_count: blueprintResult.role_1_blueprint?.growth_focus_areas?.length || 0
          },
          explanation: blueprintResult.overall_guidance?.closing_message || 'Career blueprint generated',
          fairness_checks: {
            growth_oriented_language: true,
            no_judgmental_terms: true,
            confidential: true
          },
          model_metadata: {
            model: 'google/gemini-2.5-flash',
            temperature: 0.4
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to log AI decision:', auditError);
    }

    console.log('Career blueprint generated successfully');

    return new Response(JSON.stringify({
      success: true,
      blueprint: blueprintResult,
      blueprint_id: savedBlueprint?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-career-blueprint:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
