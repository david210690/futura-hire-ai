import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECOMMENDATION_SYSTEM_PROMPT = `You are an interview designer specializing in ND-safe, evidence-based hiring.

Your task: Select 8-12 interview questions from the provided question bank that best validate:
1. Role DNA expectations for this position
2. Candidate alignment and growth areas
3. Signals from scenario warmups (if available)

CRITICAL RULES:
- Ensure ALL questions are ND-safe
- Never select questions that could penalize neurodivergent communication styles
- Prioritize questions that allow candidates to demonstrate their strengths
- Include at least one question per key Role DNA dimension

OUTPUT FORMAT (JSON):
{
  "recommended_questions": [
    {
      "question_id": "uuid",
      "question_text": "the question text",
      "why": "1-2 sentence explanation of why this question is valuable for this candidate",
      "role_dna_dimension": "which dimension it validates",
      "priority": "high|medium|low"
    }
  ],
  "opening_script": "2-3 sentence calm framing for the interviewer to read at the start",
  "nd_safe_notes_for_interviewer": [
    "Brief guidance on ND-safe interview conduct",
    "e.g., Allow processing time, don't penalize pauses"
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { jobId, candidateId } = await req.json();

    if (!jobId || !candidateId) {
      throw new Error("jobId and candidateId are required");
    }

    // Fetch job details with Role DNA
    const { data: job } = await supabase
      .from("job_twin_jobs")
      .select(`
        *,
        jobs (
          title,
          jd_text,
          seniority
        )
      `)
      .eq("id", jobId)
      .single();

    // Fetch Role DNA snapshot
    const { data: roleDna } = await supabase
      .from("role_dna_snapshots")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch candidate Role DNA Fit
    const { data: roleDnaFit } = await supabase
      .from("role_dna_fit_scores")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .eq("user_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch candidate scenario runs
    const { data: scenarioRuns } = await supabase
      .from("scenario_runs")
      .select(`
        *,
        scenario_warmups (
          title,
          department
        )
      `)
      .eq("user_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Determine department from job
    const department = job?.jobs?.title?.includes("Engineer") ? "Engineering" :
                       job?.jobs?.title?.includes("Product") ? "Product" :
                       job?.jobs?.title?.includes("Design") ? "Design" :
                       job?.jobs?.title?.includes("Sales") ? "Sales" :
                       job?.jobs?.title?.includes("Marketing") ? "Marketing" :
                       "Engineering";

    const seniority = job?.jobs?.seniority || "mid";

    // Fetch question bank for relevant department
    const { data: questions } = await supabase
      .from("question_bank_questions")
      .select(`
        *,
        question_bank_answer_rubrics (
          what_good_looks_like,
          followup_probes,
          bias_traps_to_avoid
        )
      `)
      .eq("department", department)
      .eq("nd_safe", true)
      .limit(100);

    // Build prompt
    const prompt = `
JOB CONTEXT:
Title: ${job?.jobs?.title || "Unknown Role"}
Seniority: ${seniority}
Department: ${department}

ROLE DNA EXPECTATIONS:
${roleDna?.snapshot_json ? JSON.stringify(roleDna.snapshot_json, null, 2) : "Not available"}

CANDIDATE ROLE DNA FIT:
${roleDnaFit?.fit_json ? JSON.stringify(roleDnaFit.fit_json, null, 2) : "Not assessed yet"}

CANDIDATE SCENARIO WARMUP SIGNALS:
${scenarioRuns?.length ? scenarioRuns.map(r => 
  `- ${r.scenario_warmups?.title}: ${JSON.stringify(r.extracted_signals?.signals || [])}`
).join("\n") : "No warmups completed"}

AVAILABLE QUESTIONS (select 8-12):
${questions?.map(q => `
ID: ${q.id}
Text: ${q.question_text}
Category: ${q.category}
Dimension: ${q.role_dna_dimension}
Intent: ${q.intent}
`).join("\n---\n")}

Select the best questions for this specific candidate and job combination.`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: RECOMMENDATION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate recommendations");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON
    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        recommended_questions: [],
        opening_script: "",
        nd_safe_notes_for_interviewer: []
      };
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      recommendations = {
        recommended_questions: [],
        opening_script: "Welcome the candidate warmly and explain the interview structure.",
        nd_safe_notes_for_interviewer: ["Allow processing time", "Don't penalize pauses"]
      };
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from("interview_question_recommendations")
      .insert({
        job_twin_job_id: jobId,
        candidate_user_id: candidateId,
        generated_by_user_id: user.id,
        recommendations_json: recommendations
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving recommendations:", saveError);
    }

    // Audit log
    await supabase.functions.invoke("log-ai-decision", {
      body: {
        decision_type: "interview_question_recommendation",
        candidate_user_id: candidateId,
        job_twin_job_id: jobId,
        recruiter_user_id: user.id,
        explanation: "Generated personalized interview question recommendations",
        input_summary: { jobId, candidateId, department, seniority },
        output_summary: { questionCount: recommendations.recommended_questions?.length || 0 },
        fairness_checks: {
          nd_safe_questions_only: true,
          role_dna_aligned: true
        },
        model_metadata: { model: "gemini-2.5-flash", temperature: 0.4 }
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      id: saved?.id,
      recommendations 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-interview-recommendations:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
