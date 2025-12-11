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
    console.log("Generating application package for profile:", profile_id, "job:", job_id);

    // Get profile and job data
    const [profileResult, jobResult] = await Promise.all([
      supabase.from("job_twin_profiles").select("*").eq("id", profile_id).single(),
      supabase.from("jobs").select("*, companies(name)").eq("id", job_id).single(),
    ]);

    if (profileResult.error || !profileResult.data) {
      console.error("Profile not found:", profileResult.error);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (jobResult.error || !jobResult.data) {
      console.error("Job not found:", jobResult.error);
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = profileResult.data;
    const job = jobResult.data;
    const companyName = job.companies?.name || "the company";

    const systemPrompt = `You are an expert career coach helping candidates create compelling application materials. Generate personalized, professional content that highlights the candidate's strengths and fits the job requirements.

Return JSON with this structure:
{
  "cover_letter": "A professional 3-4 paragraph cover letter tailored to the job",
  "resume_highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4", "highlight 5"],
  "key_fit_points": ["fit point 1", "fit point 2", "fit point 3"],
  "elevator_pitch": "A 30-second elevator pitch for the role",
  "screening_answers": [
    {"question": "Why do you want this role?", "answer": "..."},
    {"question": "What makes you a good fit?", "answer": "..."},
    {"question": "Where do you see yourself in 5 years?", "answer": "..."}
  ]
}

Make the content specific, authentic, and compelling. Avoid generic phrases.`;

    const userPrompt = `Generate an application package for:

Candidate Profile:
- Target Role: ${profile.ideal_role || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}
- Career Goals: ${profile.career_goals || "Not specified"}
- Preferences: ${JSON.stringify(profile.preferences || {})}

Job Details:
- Title: ${job.title}
- Company: ${companyName}
- Description: ${job.jd_text || "Not specified"}
- Location: ${job.location || "Not specified"}
- Seniority: ${job.seniority || "Not specified"}
- Remote: ${job.remote_mode || "Not specified"}

Create compelling, tailored application materials for this specific opportunity.`;

    console.log("Calling AI gateway...");
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
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    console.log("AI response received");

    let packageData = {
      cover_letter: "",
      resume_highlights: [] as string[],
      key_fit_points: [] as string[],
      elevator_pitch: "",
      screening_answers: [] as { question: string; answer: string }[],
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        packageData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    console.log("Application package generated successfully");
    return new Response(JSON.stringify(packageData), {
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
