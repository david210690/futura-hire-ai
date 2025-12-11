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

    const { session_id } = await req.json();
    console.log("Completing interview session:", session_id);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("interview_simulation_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all questions and answers
    const { data: questions } = await supabase
      .from("interview_simulation_questions")
      .select("*")
      .eq("session_id", session_id)
      .order("question_index");

    const { data: answers } = await supabase
      .from("interview_simulation_answers")
      .select("*")
      .eq("session_id", session_id);

    // Calculate overall score
    const answeredQuestions = answers || [];
    const scores = answeredQuestions.filter(a => a.score !== null).map(a => a.score);
    const overallScore = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) 
      : 0;

    // Build context for feedback generation
    const qaContext = (questions || []).map(q => {
      const answer = answeredQuestions.find(a => a.question_id === q.id);
      return `
Question ${q.question_index}: ${q.question_text}
Type: ${q.question_type}
Answer: ${answer?.transcript || "Not answered"}
Score: ${answer?.score || "N/A"}/10
Feedback: ${answer?.feedback || "N/A"}`;
    }).join("\n\n");

    const systemPrompt = `You are an expert interview coach providing a comprehensive session summary.

Interview Session:
- Role: ${session.role_title}
- Mode: ${session.mode}
- Difficulty: ${session.difficulty}
- Questions Completed: ${answeredQuestions.length}/${questions?.length || 0}
- Overall Score: ${overallScore}/100

Questions and Answers:
${qaContext}

Generate a comprehensive feedback summary with:
1. Overall performance assessment (2-3 sentences)
2. Top 3 Strengths demonstrated
3. Top 3 Areas for Improvement
4. Specific action items for practice

Return JSON:
{
  "summary": "<overall assessment paragraph>",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "action_items": ["action 1", "action 2", "action 3"]
}

Be specific, encouraging, and actionable. Reference specific answers where relevant.`;

    console.log("Generating session feedback...");
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
          { role: "user", content: "Generate the session feedback summary." },
        ],
        temperature: 0.6,
      }),
    });

    let feedbackData = {
      summary: "Session completed. Review your answers for detailed feedback.",
      strengths: [],
      improvements: [],
      action_items: [],
    };

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          feedbackData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse feedback:", content);
      }
    }

    // Format feedback summary
    const feedbackSummary = `${feedbackData.summary}

**Strengths:**
${feedbackData.strengths.map((s: string) => `• ${s}`).join("\n")}

**Areas for Improvement:**
${feedbackData.improvements.map((i: string) => `• ${i}`).join("\n")}

**Action Items:**
${feedbackData.action_items.map((a: string) => `• ${a}`).join("\n")}`;

    // Update session
    const { error: updateError } = await supabase
      .from("interview_simulation_sessions")
      .update({
        status: "completed",
        overall_score: overallScore,
        feedback_summary: feedbackSummary,
        completed_questions: answeredQuestions.length,
      })
      .eq("id", session_id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update session");
    }

    console.log("Session completed with score:", overallScore);
    return new Response(JSON.stringify({ 
      overall_score: overallScore,
      feedback_summary: feedbackSummary,
      feedback_data: feedbackData,
    }), {
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
