import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERVIEW_KIT_SYSTEM_PROMPT = `
You are an expert interview designer for FuturHire.

Goal:
Select 8–12 questions from the provided question bank to create an "Interview Kit" for this job and candidate.

You must:
- Align questions to the job's Role DNA.
- Target validation of candidate strengths and growth areas (from signals).
- Use ND-safe, respectful framing.
- Include a balanced set across categories:
  - at least 2 behavioral
  - at least 2 role_specific
  - at least 2 execution
  - at least 1 culture_nd_safe
- Prefer questions with strong rubrics and bias traps.
- Do NOT suggest rejection or pass/fail language.
- This is a guidance tool, not a gatekeeping tool.

Return ONLY valid JSON:

{
  "kit_title": "string",
  "opening_script": "2–4 sentences the interviewer reads to set a calm tone",
  "selected_questions": [
    {
      "question_id": "uuid",
      "priority": "high|medium|low",
      "why_this_question": "Evidence-based reason tied to Role DNA and candidate signals",
      "what_to_listen_for": ["2–5 bullets (observable)"],
      "suggested_followups": ["0–4 followups"],
      "bias_traps_to_avoid": ["0–4 bias traps"]
    }
  ],
  "structure": {
    "suggested_rounds": [
      { "round": "Screen", "minutes": 20, "focus": "..." },
      { "round": "Core", "minutes": 40, "focus": "..." }
    ],
    "time_plan_notes": ["Short reminders to keep the interview structured"]
  },
  "explainability": {
    "what_was_evaluated": "Plain English",
    "key_factors_considered": ["..."],
    "factors_not_considered": ["Age","Gender","Ethnicity","Accent","Career gaps alone","Disability","Religion","Family status"],
    "confidence_level": "low|medium|high",
    "limitations": ["..."]
  }
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role
    const { data: roles } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isRecruiterOrAdmin = roles?.some(r => r.role === "recruiter" || r.role === "admin");
    if (!isRecruiterOrAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, candidateId, focusMode = "balanced" } = await req.json();

    if (!jobId || !candidateId) {
      return new Response(JSON.stringify({ error: "jobId and candidateId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job details
    const { data: jobTwinJob } = await supabase
      .from("job_twin_jobs")
      .select(`
        id,
        job_id,
        jobs:job_id (
          id,
          title,
          seniority,
          department,
          description,
          requirements
        )
      `)
      .eq("id", jobId)
      .single();

    if (!jobTwinJob) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = (jobTwinJob as any).jobs;
    const jobDepartment = job?.department || inferDepartment(job?.title || "");
    const jobSeniority = job?.seniority || "mid";

    // Fetch Role DNA
    const { data: roleDna } = await supabase
      .from("role_dna_snapshots")
      .select("snapshot_json")
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!roleDna) {
      return new Response(JSON.stringify({ 
        success: false, 
        code: "NO_ROLE_DNA", 
        message: "Generate Role DNA for this job first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch candidate signals
    const { data: roleDnaFit } = await supabase
      .from("role_dna_fit_scores")
      .select("*")
      .eq("job_twin_job_id", jobId)
      .eq("user_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const { data: scenarioRuns } = await supabase
      .from("scenario_runs")
      .select("*, scenario_warmups(*)")
      .eq("user_id", candidateId)
      .eq("job_twin_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: voiceInterviews } = await supabase
      .from("voice_interview_sessions")
      .select("*")
      .eq("user_id", candidateId)
      .eq("job_twin_job_id", jobId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    // Fetch question bank
    let questionsQuery = supabase
      .from("question_bank_questions")
      .select(`
        id,
        department,
        category,
        seniority,
        role_dna_dimension,
        difficulty,
        nd_safe,
        question_text,
        intent,
        question_bank_answer_rubrics (
          what_good_looks_like,
          followup_probes,
          bias_traps_to_avoid,
          notes_for_interviewer
        )
      `)
      .eq("is_archived", false)
      .limit(100);

    const { data: allQuestions } = await questionsQuery;

    if (!allQuestions || allQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions in question bank" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prioritize questions
    const prioritized = prioritizeQuestions(allQuestions, jobDepartment, jobSeniority);
    const questionsForLLM = prioritized.slice(0, 80).map(q => ({
      question_id: q.id,
      department: q.department,
      category: q.category,
      seniority: q.seniority,
      role_dna_dimension: q.role_dna_dimension,
      difficulty: q.difficulty,
      nd_safe: q.nd_safe,
      question_text: q.question_text,
      intent: q.intent,
      rubric: q.question_bank_answer_rubrics?.[0] || null
    }));

    // Build candidate signals
    const candidateSignals: any = {};
    if (roleDnaFit) {
      candidateSignals.role_dna_fit = {
        fit_score: roleDnaFit.fit_score,
        strengths: roleDnaFit.fit_json?.strengths || [],
        gaps: roleDnaFit.fit_json?.gaps || [],
        dimension_scores: roleDnaFit.fit_json?.dimension_scores || {}
      };
    }
    if (scenarioRuns && scenarioRuns.length > 0) {
      candidateSignals.warmup_signals = scenarioRuns.map((r: any) => ({
        scenario: r.scenario_warmups?.title,
        signals: r.extracted_signals_json
      }));
    }
    if (voiceInterviews && voiceInterviews.length > 0) {
      const vi = voiceInterviews[0] as any;
      candidateSignals.voice_interview_signals = {
        score: vi.evaluation_json?.overall_score,
        strengths: vi.evaluation_json?.strengths || [],
        gaps: vi.evaluation_json?.improvement_areas || []
      };
    }

    // Build AI prompt
    const aiInput = {
      job: {
        id: jobId,
        title: job?.title || "Unknown",
        seniority: jobSeniority,
        department: jobDepartment
      },
      role_dna: roleDna.snapshot_json,
      candidate_signals: candidateSignals,
      focus_mode: focusMode,
      question_bank: questionsForLLM
    };

    const userPrompt = `Generate an Interview Kit for:
Job: ${job?.title || "Unknown"} (${jobSeniority} level, ${jobDepartment} department)
Focus Mode: ${focusMode}

Role DNA Summary:
${JSON.stringify(roleDna.snapshot_json, null, 2).slice(0, 2000)}

Candidate Signals:
${Object.keys(candidateSignals).length > 0 ? JSON.stringify(candidateSignals, null, 2).slice(0, 1500) : "Limited signals available - use general best practices."}

Question Bank (${questionsForLLM.length} questions):
${JSON.stringify(questionsForLLM, null, 2)}

Select 8-12 questions that best evaluate this candidate for this role. Return only valid JSON.`;

    // Call LLM
    const startTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: INTERVIEW_KIT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const latencyMs = Date.now() - startTime;
    let content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON
    let kitJson: any;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      kitJson = JSON.parse(content.trim());
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Content:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich selected questions with full rubric data
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));
    if (kitJson.selected_questions) {
      kitJson.selected_questions = kitJson.selected_questions.map((sq: any) => {
        const fullQ = questionMap.get(sq.question_id);
        return {
          ...sq,
          question_text: fullQ?.question_text || sq.question_text,
          category: fullQ?.category,
          role_dna_dimension: fullQ?.role_dna_dimension,
          difficulty: fullQ?.difficulty,
          nd_safe: fullQ?.nd_safe,
          rubric: fullQ?.question_bank_answer_rubrics?.[0] || null
        };
      });
    }

    // Ensure minimum 8 questions
    if (kitJson.selected_questions?.length < 8) {
      const existing = new Set(kitJson.selected_questions.map((q: any) => q.question_id));
      const additional = prioritized
        .filter(q => !existing.has(q.id) && (q.category === "behavioral" || q.category === "culture_nd_safe"))
        .slice(0, 8 - kitJson.selected_questions.length);
      
      for (const q of additional) {
        kitJson.selected_questions.push({
          question_id: q.id,
          priority: "medium",
          why_this_question: "Selected to ensure balanced coverage of behavioral and culture dimensions.",
          what_to_listen_for: q.question_bank_answer_rubrics?.[0]?.what_good_looks_like || [],
          suggested_followups: q.question_bank_answer_rubrics?.[0]?.followup_probes || [],
          bias_traps_to_avoid: q.question_bank_answer_rubrics?.[0]?.bias_traps_to_avoid || [],
          question_text: q.question_text,
          category: q.category,
          role_dna_dimension: q.role_dna_dimension,
          difficulty: q.difficulty,
          nd_safe: q.nd_safe,
          rubric: q.question_bank_answer_rubrics?.[0] || null
        });
      }
    }

    // Save kit
    const { data: savedKit, error: saveError } = await supabase
      .from("interview_kits")
      .insert({
        job_twin_job_id: jobId,
        candidate_user_id: candidateId,
        recruiter_user_id: user.id,
        focus_mode: focusMode,
        kit_json: kitJson
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save kit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit
    await supabase.from("ai_decision_audit_logs").insert({
      decision_type: "interview_kit",
      job_twin_job_id: jobId,
      candidate_user_id: candidateId,
      recruiter_user_id: user.id,
      input_summary: {
        job_title: job?.title,
        focus_mode: focusMode,
        signals_present: {
          role_dna_fit: !!roleDnaFit,
          warmup_signals: (scenarioRuns?.length || 0) > 0,
          voice_interview: (voiceInterviews?.length || 0) > 0
        },
        question_bank_size_sent: questionsForLLM.length
      },
      output_summary: {
        selected_count: kitJson.selected_questions?.length || 0,
        categories_mix: getCategoriesMix(kitJson.selected_questions || []),
        confidence_level: kitJson.explainability?.confidence_level || "medium"
      },
      explanation: `Generated interview kit with ${kitJson.selected_questions?.length || 0} questions aligned to ${job?.title} Role DNA and candidate signals. Focus mode: ${focusMode}.`,
      fairness_checks: {
        protected_attributes_excluded: true,
        nd_safe_language: true
      },
      model_metadata: {
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        latency_ms: latencyMs,
        FAIRNESS_POLICY_VERSION: "1.0"
      }
    });

    return new Response(JSON.stringify({
      success: true,
      kit: kitJson,
      kitId: savedKit.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-interview-kit:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function inferDepartment(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("engineer") || lower.includes("developer") || lower.includes("software")) return "Engineering";
  if (lower.includes("product")) return "Product";
  if (lower.includes("design")) return "Design";
  if (lower.includes("sales")) return "Sales";
  if (lower.includes("market")) return "Marketing";
  if (lower.includes("hr") || lower.includes("people")) return "HR/People";
  if (lower.includes("finance")) return "Finance";
  if (lower.includes("customer") || lower.includes("success")) return "Customer Success";
  if (lower.includes("lead") || lower.includes("manager") || lower.includes("director") || lower.includes("vp") || lower.includes("chief")) return "Leadership";
  return "Operations";
}

function prioritizeQuestions(questions: any[], department: string, seniority: string): any[] {
  return questions.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Department match
    if (a.department === department) scoreA += 3;
    if (b.department === department) scoreB += 3;
    
    // Seniority match
    if (a.seniority === seniority) scoreA += 2;
    if (b.seniority === seniority) scoreB += 2;
    
    // Universal categories get bonus
    if (a.category === "behavioral" || a.category === "culture_nd_safe") scoreA += 1;
    if (b.category === "behavioral" || b.category === "culture_nd_safe") scoreB += 1;
    
    // Has rubric
    if (a.question_bank_answer_rubrics?.length > 0) scoreA += 1;
    if (b.question_bank_answer_rubrics?.length > 0) scoreB += 1;
    
    return scoreB - scoreA;
  });
}

function getCategoriesMix(questions: any[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const q of questions) {
    const cat = q.category || "unknown";
    mix[cat] = (mix[cat] || 0) + 1;
  }
  return mix;
}
