import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SectionResult = { raw: number; max: number; percentage: number; weight: number };

const jsonValue = (value: unknown): any => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};

const responseLetter = (value: unknown): string | null => {
  const response = jsonValue(value);
  if (typeof response === "number") {
    if (response >= 1 && response <= 5) return String.fromCharCode(64 + response);
    if (response >= 0 && response <= 4) return String.fromCharCode(65 + response);
  }
  if (typeof response === "object" && response !== null) {
    return responseLetter(response.value ?? response.index ?? response.answer);
  }
  if (typeof response === "string") {
    const match = response.trim().toUpperCase().match(/^([A-E])/);
    return match?.[1] ?? null;
  }
  return null;
};

const likertValue = (value: unknown): number | null => {
  const response = jsonValue(value);
  if (typeof response === "number" && response >= 1 && response <= 5) return response;
  const letter = responseLetter(response);
  if (!letter) return null;
  const numeric = letter.charCodeAt(0) - 64;
  return numeric >= 1 && numeric <= 5 ? numeric : null;
};

const sectionTemplate = (): Record<string, SectionResult> => ({
  A: { raw: 0, max: 0, percentage: 0, weight: 30 },
  B: { raw: 0, max: 0, percentage: 0, weight: 30 },
  C: { raw: 0, max: 0, percentage: 0, weight: 40 },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { attempt_id } = await req.json();
    if (!attempt_id) throw new Error("attempt_id is required");

    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, assignment_id, attempt_answers(id, question_id, response), assignments!inner(assessment_id)")
      .eq("id", attempt_id)
      .single();
    if (attemptError) throw attemptError;

    const assessmentId = attempt.assignments.assessment_id;
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("passing_score, total_points, is_culture_gate")
      .eq("id", assessmentId)
      .single();
    if (assessmentError) throw assessmentError;

    const { data: assessmentQuestions, error: questionsError } = await supabase
      .from("assessment_questions")
      .select("question_id, order_index, question_bank(id, points, rubric, type)")
      .eq("assessment_id", assessmentId)
      .order("order_index");
    if (questionsError) throw questionsError;

    const answers = new Map<string, unknown>(
      (attempt.attempt_answers ?? []).map((answer: any) => [answer.question_id, answer.response]),
    );
    const sections = sectionTemplate();
    const criticalRedFlags: Array<{ question_number: number; question_id: string; response: string | null; reason: string }> = [];
    const answerRows = new Map<string, { score: number; feedback: string }>();

    for (const item of assessmentQuestions ?? []) {
      const question = item.question_bank as any;
      const rubric = jsonValue(question?.rubric) ?? {};
      const section = rubric.section as keyof typeof sections;
      if (!sections[section]) continue;
      const points = Number(question.points ?? 5);
      sections[section].max += points;
      const response = answers.get(item.question_id);
      const letter = responseLetter(response);
      let score = 0;

      if (rubric.sjt) {
        score = Number(rubric.sjt_scores?.[letter ?? ""] ?? 0);
      } else {
        const value = likertValue(response);
        if (value !== null) score = rubric.reverse_scored ? 6 - value : value;
      }

      sections[section].raw += score;
      answerRows.set(item.question_id, {
        score,
        feedback: rubric.reverse_scored ? "Scored with the official reverse-scoring rule." : "Scored using the official assessment key.",
      });

      const criticalOptions = Array.isArray(rubric.critical_risk_options) ? rubric.critical_risk_options : [];
      if (criticalOptions.includes(letter)) {
        criticalRedFlags.push({
          question_number: item.order_index + 1,
          question_id: item.question_id,
          response: letter,
          reason: "Critical risk response requires HR attention.",
        });
      }
      if (criticalOptions.length > 0 && !letter) {
        criticalRedFlags.push({
          question_number: item.order_index + 1,
          question_id: item.question_id,
          response: null,
          reason: "Critical risk question was not answered.",
        });
      }
    }

    for (const section of Object.values(sections)) {
      section.percentage = section.max ? Math.round((section.raw / section.max) * 100) : 0;
    }
    const finalGrade = Math.round(
      sections.A.percentage * 0.3 + sections.B.percentage * 0.3 + sections.C.percentage * 0.4,
    );
    const mandatoryGatesPass = finalGrade >= Number(assessment.passing_score ?? 70)
      && sections.A.percentage >= 60
      && sections.B.percentage >= 60
      && sections.C.percentage >= 65;
    const redFlagCount = criticalRedFlags.length;
    const decision = redFlagCount >= 3 || finalGrade < 60
      ? "failed"
      : !mandatoryGatesPass || redFlagCount === 2
        ? "hold"
        : "passed";
    const cultureGatePass = assessment.is_culture_gate ? decision === "passed" : null;
    const pass = assessment.is_culture_gate ? cultureGatePass : finalGrade >= Number(assessment.passing_score ?? 70);
    const classification = finalGrade >= 85
      ? "Exceptional Fit"
      : finalGrade >= 75
        ? "Strong Fit"
        : finalGrade >= 70
          ? "Potential Fit"
          : finalGrade >= 60 ? "Caution" : "High Risk";

    for (const [questionId, result] of answerRows) {
      await supabase.from("attempt_answers").update({ auto_score: result.score, ai_feedback: result.feedback }).eq("id", (attempt.attempt_answers ?? []).find((answer: any) => answer.question_id === questionId)?.id);
    }

    const resultMetadata = {
      sections,
      classification,
      red_flag_count: redFlagCount,
      mandatory_gates_pass: mandatoryGatesPass,
      scoring_model: "feelivacation_psychometric_v1",
    };
    const { error: updateError } = await supabase.from("attempts").update({
      ai_grade: finalGrade,
      final_grade: finalGrade,
      pass,
      dimension_scores: resultMetadata,
      critical_red_flags: criticalRedFlags,
      culture_gate_pass: cultureGatePass,
      decision,
    }).eq("id", attempt_id);
    if (updateError) throw updateError;

    const { error: assignmentError } = await supabase.from("assignments").update({ status: "graded" }).eq("id", attempt.assignment_id);
    if (assignmentError) throw assignmentError;

    return new Response(JSON.stringify({ final_grade: finalGrade, pass, decision, classification, sections, critical_red_flags: criticalRedFlags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error grading assessment:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});