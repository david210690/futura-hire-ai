import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { attempt_id, answers, time_spent_seconds } = await req.json();

    // Update attempt with submission time
    const { error: attemptError } = await supabase
      .from("attempts")
      .update({
        submitted_at: new Date().toISOString(),
        time_spent_seconds,
      })
      .eq("id", attempt_id);

    if (attemptError) throw attemptError;

    // Insert answers
    for (const answer of answers) {
      const { error: answerError } = await supabase
        .from("attempt_answers")
        .insert({
          attempt_id,
          question_id: answer.question_id,
          response: answer.response,
        });

      if (answerError) throw answerError;
    }

    // Trigger grading
    const { error: gradeError } = await supabase.functions.invoke("grade-assessment", {
      body: { attempt_id },
    });

    if (gradeError) {
      console.error("Grading error:", gradeError);
    }

    // Update assignment status
    const { data: attempt } = await supabase
      .from("attempts")
      .select("assignment_id")
      .eq("id", attempt_id)
      .single();

    if (attempt) {
      await supabase
        .from("assignments")
        .update({ status: "completed" })
        .eq("id", attempt.assignment_id);

      // Update application stage
      const { data: assignment } = await supabase
        .from("assignments")
        .select("application_id")
        .eq("id", attempt.assignment_id)
        .single();

      if (assignment) {
        await supabase
          .from("applications")
          .update({ stage: "assessment_complete" })
          .eq("id", assignment.application_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-attempt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
