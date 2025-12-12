import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_DNA_FIT_SYSTEM_PROMPT = `
You are an expert hiring strategist and organizational psychologist.

Your task:
- Compare a single candidate against a role's "Role DNA" blueprint.
- Analyze how well the candidate aligns with:
  - cognitive_patterns
  - communication_style
  - execution_style
  - problem_solving_vectors
  - culture_alignment
  - success_signals

You must produce a JSON structure describing:

{
  "fit_score": 0-100,
  "dimension_scores": {
    "cognitive_fit": 0-100,
    "communication_fit": 0-100,
    "execution_fit": 0-100,
    "problem_solving_fit": 0-100,
    "culture_fit": 0-100
  },
  "strengths": [
    "Short bullet points where the candidate is well aligned with the Role DNA."
  ],
  "gaps": [
    "Short bullet points where the candidate may need growth or adjustment."
  ],
  "recommended_next_steps": [
    "Concrete, non-judgmental suggestions for the candidate (e.g., practice, experiences to seek)."
  ],
  "narrative_summary": "2-3 sentence supportive summary of fit."
}

Fairness & ND safety rules:
- Do NOT infer gender, ethnicity, age, or any protected attribute.
- Do NOT judge personality; only focus on work-style and skills alignment.
- Non-linear careers, gaps, or neurodivergent communication styles should not be treated as automatic negatives.
- Be honest but encouraging and practical.
- This is guidance, not a verdict.

Return ONLY JSON with this schema, no extra commentary.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, message: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, message: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // 1. Fetch candidate profile data
    const { data: candidate, error: candidateError } = await supabaseClient
      .from("candidates")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 2. Fetch job twin profile for additional context
    const { data: jobTwinProfile } = await supabaseClient
      .from("job_twin_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 3. Fetch latest Role DNA snapshot for this job
    const { data: roleDnaSnapshot, error: roleDnaError } = await supabaseClient
      .from("role_dna_snapshots")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (roleDnaError || !roleDnaSnapshot) {
      console.log("No Role DNA snapshot found for job:", jobId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: "NO_ROLE_DNA", 
          message: "Role DNA has not been generated for this job yet." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch any voice interview scores for this job
    const { data: voiceInterviews } = await supabaseClient
      .from("voice_interview_sessions")
      .select("overall_score, status")
      .eq("user_id", userId)
      .eq("job_twin_job_id", jobId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    const voiceInterviewScore = voiceInterviews?.[0]?.overall_score || null;

    // 5. Build candidate profile summary
    const candidateProfile = {
      headline: candidate?.headline || "",
      full_name: candidate?.full_name || "",
      skills: candidate?.skills || "",
      years_experience: candidate?.years_experience || 0,
      summary: candidate?.summary || "",
      ideal_role: jobTwinProfile?.ideal_role || "",
      career_goals: jobTwinProfile?.career_goals || "",
      profile_skills: jobTwinProfile?.skills || [],
    };

    // 6. Build AI input
    const aiInput = {
      role_dna: roleDnaSnapshot.snapshot_json,
      candidate: {
        profile: candidateProfile,
        signals: {
          voice_interview_score: voiceInterviewScore,
          has_resume: !!candidate,
          has_job_twin_profile: !!jobTwinProfile,
        }
      }
    };

    // 7. Build user prompt
    const userPrompt = `
Analyze the following candidate against the Role DNA blueprint and produce the structured JSON output.

Role DNA Blueprint:
${JSON.stringify(aiInput.role_dna, null, 2)}

Candidate Profile and Signals:
${JSON.stringify(aiInput.candidate, null, 2)}

Return ONLY valid JSON matching the schema described in the system prompt.
`;

    console.log("Calling Lovable AI for role DNA fit evaluation...");

    // 8. Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: ROLE_DNA_FIT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, message: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, message: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, message: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // 9. Parse JSON response
    let fitResult;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      fitResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, rawContent);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Build fit_dimension_scores JSON with all details
    const fitDimensionScores = {
      cognitive_fit: fitResult.dimension_scores?.cognitive_fit || 0,
      communication_fit: fitResult.dimension_scores?.communication_fit || 0,
      execution_fit: fitResult.dimension_scores?.execution_fit || 0,
      problem_solving_fit: fitResult.dimension_scores?.problem_solving_fit || 0,
      culture_fit: fitResult.dimension_scores?.culture_fit || 0,
      strengths: fitResult.strengths || [],
      gaps: fitResult.gaps || [],
      recommended_next_steps: fitResult.recommended_next_steps || [],
    };

    // 11. Insert into role_dna_fit_scores
    const { data: insertedScore, error: insertError } = await supabaseClient
      .from("role_dna_fit_scores")
      .insert({
        user_id: userId,
        job_twin_job_id: jobId,
        role_dna_snapshot_id: roleDnaSnapshot.id,
        fit_score: fitResult.fit_score || 0,
        fit_dimension_scores: fitDimensionScores,
        summary: fitResult.narrative_summary || "",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting fit score:", insertError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to save fit score" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Role DNA fit evaluation saved:", insertedScore.id);

    // 12. Return response
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        fit: {
          fit_score: fitResult.fit_score,
          dimension_scores: fitResult.dimension_scores,
          strengths: fitResult.strengths,
          gaps: fitResult.gaps,
          recommended_next_steps: fitResult.recommended_next_steps,
          narrative_summary: fitResult.narrative_summary,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in evaluate-role-dna-fit:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
