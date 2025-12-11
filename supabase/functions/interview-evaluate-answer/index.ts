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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, question_id, transcript, audio_url } = await req.json();
    console.log("Evaluating answer for question:", question_id);

    // Fetch question details
    const { data: question, error: questionError } = await supabase
      .from("interview_simulation_questions")
      .select("*")
      .eq("id", question_id)
      .single();

    if (questionError || !question) {
      return new Response(JSON.stringify({ error: "Question not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch session for context
    const { data: session } = await supabase
      .from("interview_simulation_sessions")
      .select("role_title, mode, difficulty")
      .eq("id", session_id)
      .single();

    const systemPrompt = `You are an expert interview coach evaluating a candidate's answer.

Interview Context:
- Role: ${session?.role_title || "Unknown"}
- Mode: ${session?.mode || "mixed"}
- Difficulty: ${session?.difficulty || "mid"}

Question: ${question.question_text}
Question Type: ${question.question_type}

Ideal Answer Points:
${question.ideal_answer_points || "Not specified"}

Candidate's Answer:
${transcript}

Evaluate the answer and provide:
1. A score from 0-10 (be fair but constructive)
2. Specific feedback with:
   - What was done well
   - What could be improved
   - 2-3 actionable suggestions

Return JSON:
{
  "score": <number 0-10>,
  "feedback": "<paragraph of feedback with bullet points for suggestions>"
}

Guidelines:
- Be encouraging but honest
- Highlight specific parts of their answer that were good
- Give concrete suggestions for improvement
- Consider the difficulty level when scoring`;

    console.log("Calling AI gateway for answer evaluation...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Evaluate this interview answer and provide score and feedback." },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI evaluation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let evaluation = { score: 5, feedback: "Unable to evaluate answer." };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // Save answer to database
    const { data: answer, error: insertError } = await supabase
      .from("interview_simulation_answers")
      .insert({
        session_id,
        question_id,
        user_id: user.id,
        audio_url,
        transcript,
        score: evaluation.score,
        feedback: evaluation.feedback,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save answer");
    }

    // Get current completed count and update
    const { data: currentSession } = await supabase
      .from("interview_simulation_sessions")
      .select("completed_questions")
      .eq("id", session_id)
      .single();

    await supabase
      .from("interview_simulation_sessions")
      .update({ completed_questions: (currentSession?.completed_questions || 0) + 1 })
      .eq("id", session_id);

    console.log("Answer evaluated successfully, score:", evaluation.score);
    return new Response(JSON.stringify({ answer, evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
