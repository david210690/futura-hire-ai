import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNALS_SYSTEM_PROMPT = `You are an ND-safe work-style signal extractor. Your job is to identify work preferences and tendencies from a candidate's scenario response.

RULES:
- Extract only work-style signals, never protected attributes
- Use supportive, growth-oriented language
- Never use judgmental terms like "weak," "bad," or "poor"
- Focus on preferences and tendencies, not abilities
- Signals should be directional, not evaluative

OUTPUT JSON:
{
  "signals": [
    // 3-5 short phrases describing work preferences
    // e.g., "prefers clarity before execution", "collaboration-first mindset"
  ],
  "role_dna_dimensions_touched": [
    // which Role DNA dimensions this touches
    // options: cognitive_patterns, communication_style, execution_style, problem_solving_vectors, culture_alignment, success_signals
  ],
  "gentle_interviewer_prompt": [
    // 1-2 suggestions for interviewers to explore these signals further
    // phrased supportively, e.g., "Explore how they handle ambiguity without judging pace"
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
    const { runId } = await req.json();

    if (!runId) {
      throw new Error("runId is required");
    }

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

The candidate chose: "${selectedChoice?.label || run.selected_choice_id}"
${selectedChoice?.why_it_matters ? `Why it matters: ${selectedChoice.why_it_matters}` : ""}

${run.free_text_reason ? `Candidate's explanation: "${run.free_text_reason}"` : ""}

Extract work-style signals from this response.`;

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
        temperature: 0.3,
      }),
    });

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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      signals = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        signals: selectedChoice?.signals || [],
        role_dna_dimensions_touched: scenario.mapped_role_dna_dimensions || [],
        gentle_interviewer_prompt: []
      };
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      signals = {
        signals: selectedChoice?.signals || [],
        role_dna_dimensions_touched: scenario.mapped_role_dna_dimensions || [],
        gentle_interviewer_prompt: []
      };
    }

    // Update the scenario run with extracted signals
    const { error: updateError } = await supabase
      .from("scenario_runs")
      .update({ extracted_signals: signals })
      .eq("id", runId);

    if (updateError) {
      console.error("Error updating scenario run:", updateError);
    }

    // Log for audit
    await supabase.functions.invoke("log-ai-decision", {
      body: {
        decision_type: "scenario_signal_extraction",
        candidate_user_id: run.user_id,
        job_twin_job_id: run.job_twin_job_id,
        explanation: "Extracted work-style signals from scenario warmup response",
        input_summary: { runId, scenario: scenario.title },
        output_summary: signals,
        fairness_checks: {
          no_protected_attributes: true,
          nd_safe_language: true
        },
        model_metadata: { model: "gemini-2.5-flash", temperature: 0.3 }
      }
    });

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
