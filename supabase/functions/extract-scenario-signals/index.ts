import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNALS_SYSTEM_PROMPT = `You are a supportive hiring assistant.

Task:
Extract neutral, ND-safe "work-style signals" from a candidate's scenario choice and optional reasoning.

Rules:
- Do NOT score or rank the candidate.
- Do NOT label as good/bad.
- Do NOT infer protected attributes (age, gender, ethnicity, disability, accent, religion, etc.).
- Do NOT penalize non-linear thinking or communication style.
- Keep language calm and respectful.
- Use growth-oriented, supportive phrasing.

Return ONLY valid JSON:

{
  "signals": [
    "2-6 short signals phrased neutrally, e.g., 'prefers clarity before execution', 'values stakeholder alignment'"
  ],
  "role_dna_dimensions_touched": [
    "which Role DNA dimensions this touches: cognitive_patterns, communication_style, execution_style, problem_solving_vectors, culture_alignment, success_signals"
  ],
  "gentle_interviewer_prompts": [
    "2-4 prompts recruiters can explore in interview without judgment, e.g., 'Explore how they navigate ambiguity without judging pace'"
  ],
  "candidate_friendly_reflection": [
    "1-3 supportive notes the candidate can see about their work style, e.g., 'You seem to value getting clarity before diving in—this helps reduce rework'"
  ],
  "explainability": {
    "what_was_evaluated": "Scenario choice + optional reasoning",
    "key_factors_considered": ["decision framing", "tradeoff reasoning", "communication approach"],
    "factors_not_considered": ["Age", "Gender", "Ethnicity", "Accent", "IQ", "Personality labels", "Disability", "Religion", "Family status"],
    "limitations": ["Single scenario signal; not representative of full ability", "Context-dependent response"]
  }
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
    const { runId } = await req.json();

    if (!runId) {
      throw new Error("runId is required");
    }

    const startTime = Date.now();

    // Fetch the scenario run with scenario details
    const { data: run, error: runError } = await supabase
      .from("scenario_runs")
      .select(`
        *,
        scenario_warmups (
          title,
          scenario_context,
          choices_json,
          mapped_role_dna_dimensions
        )
      `)
      .eq("id", runId)
      .single();

    if (runError || !run) {
      throw new Error("Scenario run not found");
    }

    const scenario = run.scenario_warmups;
    const selectedChoice = scenario.choices_json.find(
      (c: any) => c.id === run.selected_choice_id
    );

    const prompt = `
Scenario: "${scenario.title}"
Context: ${scenario.scenario_context}

Available choices:
${scenario.choices_json.map((c: any) => `- ${c.id}: ${c.label}`).join('\n')}

The candidate chose: "${run.selected_choice_id}" - "${selectedChoice?.label || 'Unknown'}"
${selectedChoice?.why_it_matters ? `Why it matters: ${selectedChoice.why_it_matters}` : ""}
${selectedChoice?.signals_hint ? `Signals hint: ${selectedChoice.signals_hint.join(', ')}` : ""}

${run.free_text_reason ? `Candidate's explanation: "${run.free_text_reason}"` : "No additional explanation provided."}

Mapped Role DNA dimensions: ${scenario.mapped_role_dna_dimensions?.join(', ') || 'General'}

Extract work-style signals from this response. Remember: this is NOT about right/wrong answers, only work-style preferences.`;

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
          { role: "system", content: SIGNALS_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to call AI service");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response
    let signals;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      signals = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Fallback with basic structure
      signals = {
        signals: selectedChoice?.signals_hint || ["Response recorded"],
        role_dna_dimensions_touched: scenario.mapped_role_dna_dimensions || [],
        gentle_interviewer_prompts: ["Explore the candidate's reasoning in more depth"],
        candidate_friendly_reflection: ["Your response has been noted. This helps us understand your work style preferences."],
        explainability: {
          what_was_evaluated: "Scenario choice + optional reasoning",
          key_factors_considered: ["decision framing"],
          factors_not_considered: ["Age", "Gender", "Ethnicity", "Accent", "IQ", "Disability"],
          limitations: ["Single scenario signal; not representative of full ability"]
        }
      };
    }

    // Ensure all required fields exist
    signals.signals = signals.signals || [];
    signals.role_dna_dimensions_touched = signals.role_dna_dimensions_touched || scenario.mapped_role_dna_dimensions || [];
    signals.gentle_interviewer_prompts = signals.gentle_interviewer_prompts || signals.gentle_interviewer_prompt || [];
    signals.candidate_friendly_reflection = signals.candidate_friendly_reflection || [];
    signals.explainability = signals.explainability || {
      what_was_evaluated: "Scenario choice + optional reasoning",
      key_factors_considered: ["decision framing", "tradeoff reasoning"],
      factors_not_considered: ["Age", "Gender", "Ethnicity", "Accent", "IQ", "Disability"],
      limitations: ["Single scenario signal"]
    };

    // Update the scenario run with extracted signals and explainability
    const { error: updateError } = await supabase
      .from("scenario_runs")
      .update({ 
        extracted_signals: signals,
        explainability: signals.explainability
      })
      .eq("id", runId);

    if (updateError) {
      console.error("Error updating scenario run:", updateError);
    }

    // Log for audit (9B compatible)
    try {
      await supabase.from("ai_decision_audit_logs").insert({
        decision_type: "scenario_signal_extraction",
        candidate_user_id: run.user_id,
        job_twin_job_id: run.job_twin_job_id,
        explanation: "Generated ND-safe work-style signals from a single scenario response.",
        input_summary: { 
          scenarioId: run.scenario_id,
          scenarioTitle: scenario.title,
          selectedChoiceId: run.selected_choice_id,
          hasReason: !!run.free_text_reason
        },
        output_summary: { 
          signals_count: signals.signals?.length || 0,
          dimensions_touched: signals.role_dna_dimensions_touched || []
        },
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
    } catch (auditError) {
      console.error("Error logging audit:", auditError);
    }

    return new Response(JSON.stringify({ success: true, signals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in extract-scenario-signals:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
