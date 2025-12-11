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

    const { profile_id, job_id } = await req.json();

    // Get profile and job data
    const [profileResult, jobResult] = await Promise.all([
      supabase.from("job_twin_profiles").select("*").eq("id", profile_id).single(),
      supabase.from("jobs").select("*").eq("id", job_id).single(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (jobResult.error || !jobResult.data) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = profileResult.data;
    const job = jobResult.data;

    const systemPrompt = `You are an interview coach. Generate personalized interview questions and tips based on the candidate's profile and the job they're applying for.

Return JSON with this structure:
{
  "questions": ["question 1", "question 2", ...],
  "tips": ["tip 1", "tip 2", ...]
}

Generate 5-7 questions mixing behavioral, technical, and situational types.
Provide 3-4 actionable tips.`;

    const userPrompt = `Candidate Profile:
- Ideal Role: ${profile.ideal_role}
- Skills: ${profile.skills?.join(", ")}
- Career Goals: ${profile.career_goals}

Job Details:
- Title: ${job.title}
- Description: ${job.description || "N/A"}
- Requirements: ${job.requirements || "N/A"}
- Seniority: ${job.seniority || "N/A"}`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      throw new Error("AI prep generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let prepData = { questions: [] as string[], tips: [] as string[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prepData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // Upsert interview prep
    const { data: existingPrep } = await supabase
      .from("job_twin_interview_prep")
      .select("id")
      .eq("profile_id", profile_id)
      .eq("job_id", job_id)
      .single();

    if (existingPrep) {
      await supabase
        .from("job_twin_interview_prep")
        .update({
          questions: prepData.questions,
          tips: prepData.tips,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPrep.id);
    } else {
      await supabase.from("job_twin_interview_prep").insert({
        profile_id,
        job_id,
        questions: prepData.questions,
        tips: prepData.tips,
      });
    }

    return new Response(JSON.stringify(prepData), {
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
