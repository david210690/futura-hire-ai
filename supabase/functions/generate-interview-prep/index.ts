import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERVIEW_PREP_SYSTEM_PROMPT = `
You are an experienced interview coach for a platform called FuturHire.

Your task:
- Use the Role DNA of the job and the candidate's Role DNA Fit to create a personalized interview preparation plan.
- Focus on being:
  - specific,
  - practical,
  - non-judgmental,
  - neurodiversity-aware,
  - emotionally safe.

You must produce JSON with this structure:

{
  "overall_strategy": {
    "summary": "2-3 sentence overview of how the candidate should approach interviews for this role.",
    "mindset_notes": [
      "Short, supportive reminders that reduce anxiety and avoid harsh self-judgment."
    ]
  },
  "focus_areas": [
    {
      "label": "Example: Systems thinking for frontend architecture",
      "reason": "Why this matters for THIS role (based on Role DNA + Fit gaps).",
      "what_good_looks_like": [
        "Bullet points describing strong performance in this area."
      ]
    }
  ],
  "behavioral_preparation": {
    "story_themes": [
      "Example: Ownership under ambiguity",
      "Example: Handling conflicts in cross-functional teams"
    ],
    "story_prompts": [
      "Example: 'Tell me about a time you had to ship under unclear requirements. How did you create clarity?'"
    ],
    "tips": [
      "Use STAR format or similar; give extra clarity for ND candidates to structure their thinking."
    ]
  },
  "technical_or_role_specific_preparation": {
    "topics": [
      "Example: React performance patterns",
      "Example: Basic system design for frontend-heavy systems"
    ],
    "question_examples": [
      "Example: 'How would you design a dashboard that updates in real-time?'"
    ],
    "practice_ideas": [
      "Example: Build or refactor a small project and be ready to talk through tradeoffs."
    ]
  },
  "communication_and_style_alignment": {
    "suggestions": [
      "How to align with the communication_style of the role (e.g., async-friendly, clear written updates)."
    ],
    "sample_phrases": [
      "Example: 'Given the ambiguity, here's how I would break this down...'"
    ]
  },
  "mock_interview_plan": {
    "sessions": [
      {
        "label": "Session 1: Warmup — Behavioral & mindset",
        "focus": "Confidence and narrative clarity.",
        "recommended_mode": "voice"
      },
      {
        "label": "Session 2: Core technical questions",
        "focus": "Role-specific problem solving.",
        "recommended_mode": "voice"
      }
    ],
    "notes": [
      "Encourage shorter, frequent practice instead of long, exhausting sessions."
    ]
  }
}

Fairness & ND safety:
- Do NOT penalize non-linear careers or gaps.
- Do NOT infer or mention any protected characteristic (gender, ethnicity, age, etc.).
- Provide encouragement: point out strengths clearly and frame gaps as growth areas, not flaws.

Return ONLY JSON.
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    console.log("Generating interview prep for user:", userId, "job:", jobId);

    // 1. Fetch candidate profile
    const { data: candidate } = await supabaseClient
      .from("candidates")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Also get job twin profile
    const { data: jobTwinProfile } = await supabaseClient
      .from("job_twin_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 2. Fetch job twin job
    const { data: jobTwinJob } = await supabaseClient
      .from("job_twin_jobs")
      .select("*, jobs(title, jd_text, seniority, tags, location, remote_mode)")
      .eq("id", jobId)
      .single();

    if (!jobTwinJob) {
      return new Response(
        JSON.stringify({ success: false, message: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch Role DNA for this job
    const { data: roleDnaSnapshot } = await supabaseClient
      .from("role_dna_snapshots")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!roleDnaSnapshot) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: "NO_ROLE_DNA",
          message: "Role DNA has not been generated for this role yet." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch Role DNA Fit for this user + job
    const { data: roleDnaFit } = await supabaseClient
      .from("role_dna_fit_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!roleDnaFit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: "NO_ROLE_DNA_FIT",
          message: "Please check your Role Fit for this role first." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Fetch voice interview signals (optional)
    const { data: voiceInterviews } = await supabaseClient
      .from("voice_interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(3);

    // Build interview signals
    let interviewSignals: any = {
      voice_interview_score: null,
      notes: []
    };

    if (voiceInterviews && voiceInterviews.length > 0) {
      const latestInterview = voiceInterviews[0];
      interviewSignals.voice_interview_score = latestInterview.overall_score || null;
      if (latestInterview.strengths && Array.isArray(latestInterview.strengths)) {
        interviewSignals.notes.push(`Previous interview strengths: ${(latestInterview.strengths as string[]).join(", ")}`);
      }
      if (latestInterview.improvement_areas && Array.isArray(latestInterview.improvement_areas)) {
        interviewSignals.notes.push(`Areas to develop: ${(latestInterview.improvement_areas as string[]).join(", ")}`);
      }
    }

    // 6. Build AI input
    const candidateProfile = {
      headline: candidate?.headline || jobTwinProfile?.ideal_role || "Not specified",
      years_experience: candidate?.years_experience || 0,
      skills: candidate?.skills || (jobTwinProfile?.skills ? (jobTwinProfile.skills as string[]).join(", ") : ""),
      career_goals: jobTwinProfile?.career_goals || "",
      summary: candidate?.summary || ""
    };

    const fitDimensionScores = roleDnaFit.fit_dimension_scores as any || {};
    
    const aiInput = {
      candidate_profile: candidateProfile,
      role_dna: roleDnaSnapshot.snapshot_json,
      role_dna_fit: {
        fit_score: roleDnaFit.fit_score,
        dimension_scores: fitDimensionScores,
        strengths: fitDimensionScores.strengths || [],
        gaps: fitDimensionScores.gaps || [],
        recommended_next_steps: fitDimensionScores.recommended_next_steps || []
      },
      interview_signals: interviewSignals,
      job_context: {
        title: jobTwinJob.jobs?.title || "Unknown Role",
        seniority: jobTwinJob.jobs?.seniority || "not_specified",
        location: jobTwinJob.jobs?.location || "",
        remote_mode: jobTwinJob.jobs?.remote_mode || ""
      }
    };

    const userPrompt = `
Based on the following data, create a personalized interview preparation plan for this candidate:

${JSON.stringify(aiInput, null, 2)}

Create a comprehensive, supportive interview prep plan following the JSON schema in your instructions.
Focus on the candidate's growth areas identified in their Role DNA Fit, and build on their strengths.
`;

    // 7. Call LLM
    const startTime = Date.now();
    const llmResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: INTERVIEW_PREP_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM error:", errorText);
      throw new Error("AI service error");
    }

    const llmData = await llmResponse.json();
    const latencyMs = Date.now() - startTime;
    const content = llmData.choices?.[0]?.message?.content || "";

    console.log("LLM response received, latency:", latencyMs);

    // 8. Parse JSON
    let planJson;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      planJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse AI response");
    }

    // 9. Insert into interview_prep_plans
    const { data: insertedPlan, error: insertError } = await supabaseClient
      .from("interview_prep_plans")
      .insert({
        user_id: userId,
        job_twin_job_id: jobId,
        role_dna_fit_id: roleDnaFit.id,
        plan_json: planJson
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save prep plan");
    }

    // Log AI run
    await supabaseClient.from("ai_runs").insert({
      kind: "interview_prep_generation",
      created_by: userId,
      input_ref: jobId,
      latency_ms: latencyMs,
      model_name: "google/gemini-2.5-flash",
      output_json: planJson,
      status: "ok"
    });

    console.log("Interview prep plan saved:", insertedPlan.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        plan: planJson,
        createdAt: insertedPlan.created_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-interview-prep:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
