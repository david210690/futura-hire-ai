import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OFFER_LIKELIHOOD_SYSTEM_PROMPT = `
You are a recruiting strategist. Estimate the candidate's directional "Offer Likelihood" for this role.

Offer Likelihood means: the probability (directional, not guaranteed) that this candidate will:
- perform strongly in interviews,
- progress through stages,
- and accept / close to offer if extended (if stage is earlier, estimate likelihood to reach offer-ready status).

You MUST:
- Use only evidence from the provided data (Role DNA, Role DNA Fit, Shortlist Score, interview signals, stage).
- Never infer protected characteristics (gender, ethnicity, age, religion, disability, etc.).
- Do not penalize non-linear careers or ND communication styles.
- Treat this as guidance, not judgment. No harsh language.

Return ONLY JSON matching:

{
  "likelihood_score": 0-100,
  "likelihood_band": "high" | "medium" | "low",
  "key_drivers": [
    "Top 3–5 reasons that increase likelihood (evidence-based)"
  ],
  "key_risks": [
    "Top 3–5 risks that could block progress (evidence-based)"
  ],
  "recommended_next_actions": [
    "Concrete recruiter actions to de-risk (e.g., structured interview focus, references, clarify constraints)"
  ],
  "candidate_friendly_coaching": [
    "Optional: 2–4 supportive notes recruiter can share with candidate (ND-safe)"
  ],
  "disclaimer": "One sentence: directional estimate, not a promise."
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
    console.log("Bulk generating offer likelihood for job:", jobId);

    // Fetch job twin job with job details
    const { data: jobTwinJob } = await supabaseClient
      .from("job_twin_jobs")
      .select("*, jobs(title, jd_text, seniority, location)")
      .eq("id", jobId)
      .single();

    if (!jobTwinJob) {
      return new Response(
        JSON.stringify({ success: false, message: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Role DNA snapshot for the job
    const { data: roleDnaSnapshot } = await supabaseClient
      .from("role_dna_snapshots")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch all candidates who have applied or interacted with this job
    // Get candidates from job_twin_profiles linked to this job
    const { data: allFitScores } = await supabaseClient
      .from("role_dna_fit_scores")
      .select("user_id")
      .eq("job_twin_job_id", jobId);

    const { data: allShortlistScores } = await supabaseClient
      .from("shortlist_predictive_scores")
      .select("user_id")
      .eq("job_twin_job_id", jobId);

    // Combine unique candidate user IDs
    const candidateUserIds = new Set<string>();
    allFitScores?.forEach(s => candidateUserIds.add(s.user_id));
    allShortlistScores?.forEach(s => candidateUserIds.add(s.user_id));

    if (candidateUserIds.size === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No candidates to assess", processed: 0, skipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing offer likelihood scores
    const { data: existingScores } = await supabaseClient
      .from("offer_likelihood_scores")
      .select("candidate_user_id")
      .eq("job_twin_job_id", jobId);

    const existingCandidateIds = new Set(existingScores?.map(s => s.candidate_user_id) || []);

    // Filter to only unassessed candidates
    const candidatesToAssess = Array.from(candidateUserIds).filter(id => !existingCandidateIds.has(id));

    if (candidatesToAssess.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All candidates already assessed", 
          processed: 0, 
          skipped: candidateUserIds.size 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Assessing ${candidatesToAssess.length} candidates, skipping ${existingCandidateIds.size} already assessed`);

    let processed = 0;
    let errors = 0;

    // Process each candidate
    for (const candidateId of candidatesToAssess) {
      try {
        // Fetch candidate profile
        const { data: candidate } = await supabaseClient
          .from("candidates")
          .select("*")
          .eq("user_id", candidateId)
          .single();

        // Fetch job twin profile for candidate
        const { data: jobTwinProfile } = await supabaseClient
          .from("job_twin_profiles")
          .select("*")
          .eq("user_id", candidateId)
          .single();

        // Fetch Role DNA Fit
        const { data: roleDnaFit } = await supabaseClient
          .from("role_dna_fit_scores")
          .select("*")
          .eq("user_id", candidateId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Fetch Shortlist Predictive Score
        const { data: shortlistScore } = await supabaseClient
          .from("shortlist_predictive_scores")
          .select("*")
          .eq("user_id", candidateId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Fetch Voice Interview Sessions
        const { data: voiceInterviews } = await supabaseClient
          .from("voice_interview_sessions")
          .select("*")
          .eq("user_id", candidateId)
          .eq("job_twin_job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(3);

        // Build interview signals
        const interviewSignals: any = {
          voice_interview_score: null,
          notes: []
        };

        if (voiceInterviews && voiceInterviews.length > 0) {
          const latestInterview = voiceInterviews[0];
          interviewSignals.voice_interview_score = latestInterview.overall_score || null;
          if (latestInterview.strengths) {
            interviewSignals.notes.push(`Strengths: ${(latestInterview.strengths as string[]).join(", ")}`);
          }
          if (latestInterview.improvement_areas) {
            interviewSignals.notes.push(`Areas to develop: ${(latestInterview.improvement_areas as string[]).join(", ")}`);
          }
        }

        // Build AI input
        const candidateProfile = {
          headline: candidate?.headline || jobTwinProfile?.ideal_role || "Not specified",
          years_experience: candidate?.years_experience || 0,
          skills: candidate?.skills || (jobTwinProfile?.skills ? (jobTwinProfile.skills as string[]).join(", ") : ""),
          summary: candidate?.summary || ""
        };

        const fitDimensionScores = roleDnaFit?.fit_dimension_scores as any || {};

        const aiInput = {
          jobId,
          candidateId,
          candidate_profile: candidateProfile,
          pipeline_stage: jobTwinJob.status || "applied",
          role_dna: roleDnaSnapshot?.snapshot_json || null,
          role_dna_fit: roleDnaFit ? {
            fit_score: roleDnaFit.fit_score,
            dimension_scores: fitDimensionScores,
            strengths: fitDimensionScores.strengths || [],
            gaps: fitDimensionScores.gaps || []
          } : null,
          shortlist_score: shortlistScore ? {
            score: shortlistScore.score,
            summary: (shortlistScore.reasoning_json as any)?.final_summary || ""
          } : null,
          interview_signals: interviewSignals,
          job_context: {
            title: jobTwinJob.jobs?.title || "Unknown Role",
            seniority: jobTwinJob.jobs?.seniority || "not_specified"
          }
        };

        const userPrompt = `
Analyze the following candidate data and estimate their Offer Likelihood for this role:

${JSON.stringify(aiInput, null, 2)}

Provide a directional estimate based on the available evidence. Be fair, evidence-based, and supportive.
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
              { role: "system", content: OFFER_LIKELIHOOD_SYSTEM_PROMPT },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.25,
          }),
        });

        if (!llmResponse.ok) {
          console.error("LLM error for candidate", candidateId);
          errors++;
          continue;
        }

        const llmData = await llmResponse.json();
        const latencyMs = Date.now() - startTime;
        const content = llmData.choices?.[0]?.message?.content || "";

        // Parse JSON
        let resultJson;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found");
          resultJson = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("JSON parse error for candidate", candidateId);
          errors++;
          continue;
        }

        // Derive likelihood_band if not provided
        let likelihoodBand = resultJson.likelihood_band;
        if (!likelihoodBand || !["high", "medium", "low"].includes(likelihoodBand)) {
          const score = resultJson.likelihood_score || 0;
          if (score >= 75) likelihoodBand = "high";
          else if (score >= 45) likelihoodBand = "medium";
          else likelihoodBand = "low";
        }

        // Insert into offer_likelihood_scores
        await supabaseClient
          .from("offer_likelihood_scores")
          .insert({
            job_twin_job_id: jobId,
            candidate_user_id: candidateId,
            recruiter_user_id: recruiterUserId,
            shortlist_score_id: shortlistScore?.id || null,
            role_dna_fit_id: roleDnaFit?.id || null,
            likelihood_score: resultJson.likelihood_score,
            likelihood_band: likelihoodBand,
            reasoning_json: resultJson
          });

        // Log AI run
        await supabaseClient.from("ai_runs").insert({
          kind: "bulk_offer_likelihood_generation",
          created_by: recruiterUserId,
          input_ref: `${jobId}:${candidateId}`,
          latency_ms: latencyMs,
          model_name: "google/gemini-2.5-flash",
          output_json: resultJson,
          status: "ok"
        });

        processed++;
        console.log(`Processed candidate ${candidateId} (${processed}/${candidatesToAssess.length})`);

      } catch (candidateError) {
        console.error("Error processing candidate", candidateId, candidateError);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bulk assessment complete`,
        processed,
        skipped: existingCandidateIds.size,
        errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in bulk-generate-offer-likelihood:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
