import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIPELINE_HEALTH_SYSTEM_PROMPT = `
You are a recruiting operations lead. Analyze a job pipeline snapshot and produce a "Pipeline Health" report.

Return ONLY JSON:

{
  "health_score": 0-100,
  "summary": "2–4 sentences describing overall pipeline condition.",
  "stage_distribution": [
    { "stage": "applied", "count": 0 },
    { "stage": "screening", "count": 0 },
    { "stage": "interview", "count": 0 },
    { "stage": "offer", "count": 0 }
  ],
  "bottlenecks": [
    {
      "stage": "screening/interview/offer",
      "issue": "What is slowing conversion",
      "evidence": "Evidence from counts/scores",
      "fix": "Concrete actions"
    }
  ],
  "top_candidates_to_focus": [
    {
      "candidateId": "...",
      "why": "Evidence-based reason to prioritize",
      "next_action": "Concrete next step"
    }
  ],
  "risk_flags": [
    "Examples: too many candidates with missing Role DNA fit; interview scores low; too few high shortlist scores"
  ],
  "next_7_days_plan": [
    "Actionable checklist for recruiter for the next week"
  ],
  "fairness_note": "One short reminder about using AI scores as signals, not gatekeepers."
}
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

    const recruiterUserId = user.id;
    console.log("Generating pipeline health for job:", jobId);

    // Fetch job twin job with job details
    const { data: jobTwinJob } = await supabaseClient
      .from("job_twin_jobs")
      .select("*, jobs(title, seniority)")
      .eq("id", jobId)
      .single();

    if (!jobTwinJob) {
      return new Response(
        JSON.stringify({ success: false, message: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all candidates in the pipeline for this job (via job_twin_jobs with same job_id)
    const { data: pipelineCandidates } = await supabaseClient
      .from("job_twin_jobs")
      .select("id, status, profile_id, job_twin_profiles(user_id)")
      .eq("job_id", jobTwinJob.job_id)
      .limit(50);

    // Build candidate data with scores
    const candidatesData = [];
    const stageCounts: Record<string, number> = {
      "new": 0,
      "saved": 0,
      "applied": 0,
      "interview": 0,
      "offer": 0,
      "rejected": 0
    };

    if (pipelineCandidates) {
      for (const pc of pipelineCandidates) {
        const stage = pc.status || "new";
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;

        const userId = (pc as any).job_twin_profiles?.user_id;
        if (!userId) continue;

        // Fetch scores for this candidate
        const { data: shortlistScore } = await supabaseClient
          .from("shortlist_predictive_scores")
          .select("score")
          .eq("user_id", userId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: roleDnaFit } = await supabaseClient
          .from("role_dna_fit_scores")
          .select("fit_score")
          .eq("user_id", userId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: offerLikelihood } = await supabaseClient
          .from("offer_likelihood_scores")
          .select("likelihood_score")
          .eq("candidate_user_id", userId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: voiceInterview } = await supabaseClient
          .from("voice_interview_sessions")
          .select("overall_score")
          .eq("user_id", userId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        candidatesData.push({
          candidateId: userId,
          stage,
          shortlist_score: shortlistScore?.score || null,
          role_dna_fit_score: roleDnaFit?.fit_score || null,
          offer_likelihood_score: offerLikelihood?.likelihood_score || null,
          voice_interview_score: voiceInterview?.overall_score || null
        });
      }
    }

    // Build AI input
    const aiInput = {
      job: {
        id: jobId,
        title: jobTwinJob.jobs?.title || "Unknown Role",
        seniority: jobTwinJob.jobs?.seniority || "not_specified"
      },
      pipeline_counts: stageCounts,
      total_candidates: candidatesData.length,
      candidates: candidatesData
    };

    const userPrompt = `
Analyze the following job pipeline data and produce a Pipeline Health report:

${JSON.stringify(aiInput, null, 2)}

Identify bottlenecks, top candidates to focus on, risks, and provide a 7-day action plan.
`;

    // Call LLM
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
          { role: "system", content: PIPELINE_HEALTH_SYSTEM_PROMPT },
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

    // Parse JSON
    let resultJson;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      resultJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse AI response");
    }

    // Insert into pipeline_health_snapshots
    const { data: insertedSnapshot, error: insertError } = await supabaseClient
      .from("pipeline_health_snapshots")
      .insert({
        job_twin_job_id: jobId,
        recruiter_user_id: recruiterUserId,
        snapshot_json: resultJson
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save pipeline health");
    }

    // Log AI run
    await supabaseClient.from("ai_runs").insert({
      kind: "pipeline_health_generation",
      created_by: recruiterUserId,
      input_ref: jobId,
      latency_ms: latencyMs,
      model_name: "google/gemini-2.5-flash",
      output_json: resultJson,
      status: "ok"
    });

    console.log("Pipeline health saved:", insertedSnapshot.id);

    return new Response(
      JSON.stringify({
        success: true,
        snapshot: resultJson,
        createdAt: insertedSnapshot.created_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-pipeline-health:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
