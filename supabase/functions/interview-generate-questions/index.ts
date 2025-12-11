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

    const { session_id, job_twin_job_id, role_title, mode, difficulty, count } = await req.json();
    console.log("Generating interview questions:", { role_title, mode, difficulty, count });

    // Fetch user's job twin profile
    const { data: profile } = await supabase
      .from("job_twin_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Fetch job details if job_twin_job_id provided
    let jobContext = "";
    if (job_twin_job_id) {
      const { data: jobTwinJob } = await supabase
        .from("job_twin_jobs")
        .select("*, jobs(title, jd_text, location, seniority, companies(name))")
        .eq("id", job_twin_job_id)
        .single();

      if (jobTwinJob?.jobs) {
        const job = jobTwinJob.jobs;
        jobContext = `
Job Context:
- Title: ${job.title}
- Company: ${job.companies?.name || "Unknown"}
- Seniority: ${job.seniority}
- Job Description: ${job.jd_text?.substring(0, 1500) || "Not provided"}`;
      }
    }

    const profileContext = profile ? `
Candidate Profile:
- Target Role: ${profile.ideal_role || role_title}
- Skills: ${profile.skills?.join(", ") || "Not specified"}
- Career Goals: ${profile.career_goals || "Not specified"}` : "";

    const modeInstructions = {
      technical: "Focus on technical skills, coding concepts, system design, and role-specific technical knowledge.",
      behavioral: "Focus on STAR-format behavioral questions about past experiences, teamwork, leadership, and problem-solving.",
      mixed: "Include a balanced mix of technical and behavioral questions.",
    };

    const difficultyInstructions = {
      junior: "Questions should be entry-level, focusing on fundamentals and basic concepts.",
      mid: "Questions should be intermediate, expecting practical experience and deeper understanding.",
      senior: "Questions should be advanced, covering architecture, leadership, complex problem-solving, and strategic thinking.",
    };

    const systemPrompt = `You are an expert technical interviewer generating realistic interview questions.
    
Generate ${count} interview questions for a ${role_title} position.

Mode: ${mode} - ${modeInstructions[mode as keyof typeof modeInstructions]}
Difficulty: ${difficulty} - ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions]}

${profileContext}
${jobContext}

Return a JSON array of questions:
[
  {
    "question_text": "The full interview question",
    "question_type": "technical" | "behavioral" | "hr",
    "ideal_answer_points": "3-5 bullet points describing what a good answer should cover"
  }
]

Guidelines:
- Make questions specific and realistic
- For behavioral questions, use STAR format prompts
- For technical questions, be specific to the role's tech stack
- Include a mix of question types within the mode
- Ideal answer points should be concise but comprehensive`;

    console.log("Calling AI gateway for question generation...");
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
          { role: "user", content: `Generate ${count} ${mode} interview questions for ${role_title} at ${difficulty} level.` },
        ],
        temperature: 0.8,
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
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let questions = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse questions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert questions into database
    const questionsToInsert = questions.map((q: any, index: number) => ({
      session_id,
      user_id: user.id,
      question_index: index + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      ideal_answer_points: q.ideal_answer_points,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from("interview_simulation_questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save questions");
    }

    // Update session with total questions
    await supabase
      .from("interview_simulation_sessions")
      .update({ total_questions: questions.length })
      .eq("id", session_id);

    console.log(`Generated ${questions.length} questions successfully`);
    return new Response(JSON.stringify({ questions: insertedQuestions }), {
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
