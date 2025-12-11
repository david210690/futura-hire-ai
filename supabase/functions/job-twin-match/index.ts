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

    const { profile_id } = await req.json();

    // Get the Job Twin profile
    const { data: profile, error: profileError } = await supabase
      .from("job_twin_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get available PUBLIC jobs across all orgs
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, description, requirements, location, remote_mode, seniority, companies(name)")
      .eq("status", "open")
      .eq("is_public", true)
      .limit(20);

    if (jobsError || !jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to match jobs
    const systemPrompt = `You are a job matching AI. Given a candidate's profile and job listings, score each job from 0-100 based on fit and provide 2-3 short match reasons.

Return a JSON array with this structure:
[{"job_id": "uuid", "score": 85, "reasons": ["skill match", "culture fit"]}]

Only include jobs with score >= 50.`;

    const userPrompt = `Candidate Profile:
- Ideal Role: ${profile.ideal_role}
- Skills: ${profile.skills?.join(", ")}
- Career Goals: ${profile.career_goals}
- Preferences: ${JSON.stringify(profile.preferences)}

Jobs to evaluate:
${jobs.map((j: any) => `- ID: ${j.id}, Title: ${j.title}, Company: ${j.companies?.name || "N/A"}, Requirements: ${j.requirements || "N/A"}, Location: ${j.location || "N/A"}, Remote: ${j.remote_mode || "N/A"}`).join("\n")}`;

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
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      throw new Error("AI matching failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse AI response
    let matches: { job_id: string; score: number; reasons: string[] }[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // Clear old matches and insert new ones
    await supabase
      .from("job_twin_jobs")
      .delete()
      .eq("profile_id", profile_id);

    if (matches.length > 0) {
      const insertData = matches.map(m => ({
        profile_id,
        job_id: m.job_id,
        match_score: m.score,
        match_reasons: m.reasons,
      }));

      await supabase.from("job_twin_jobs").insert(insertData);
    }

    return new Response(JSON.stringify({ matches }), {
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
