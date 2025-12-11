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

    const { job_twin_job_id, profile_id, current_offer_salary, candidate_desired_salary, non_salary_items } = await req.json();
    console.log("Generating negotiation plan for job:", job_twin_job_id);

    // Fetch job details
    const { data: jobTwinJob, error: jobError } = await supabase
      .from("job_twin_jobs")
      .select("*, jobs(title, jd_text, location, salary_range, seniority, companies(name))")
      .eq("id", job_twin_job_id)
      .single();

    if (jobError || !jobTwinJob) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile
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

    const job = jobTwinJob.jobs;
    const companyName = job?.companies?.name || "the company";

    const systemPrompt = `You are an expert salary negotiation coach. Help the candidate negotiate effectively.

Return JSON:
{
  "negotiation_strategy_summary": "2-3 sentence strategy overview",
  "negotiation_email_template": "A professional negotiation email (150-250 words)",
  "talking_points": "• Point 1\\n• Point 2\\n• Point 3\\n• Point 4\\n• Point 5"
}

Guidelines:
- Be empathetic but assertive
- Focus on mutual value and long-term fit
- Clear about expectations without being demanding
- Provide specific, actionable advice
- Consider both salary and non-salary items`;

    const userPrompt = `Create a negotiation plan for:

Candidate:
- Target Role: ${profile.ideal_role || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}
- Career Goals: ${profile.career_goals || "Not specified"}

Job:
- Title: ${job?.title || "Not specified"}
- Company: ${companyName}
- Posted Salary Range: ${job?.salary_range || "Not disclosed"}
- Seniority: ${job?.seniority || "Not specified"}

Negotiation Details:
- Current Offer: ${current_offer_salary || "Not yet received"}
- Candidate's Desired Salary: ${candidate_desired_salary || "Not specified"}
- Non-Salary Items to Negotiate: ${non_salary_items || "None specified"}

Create a comprehensive negotiation strategy with email template and talking points.`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let result = {
      negotiation_strategy_summary: "",
      negotiation_email_template: "",
      talking_points: "",
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // Save to negotiation notes
    const { error: upsertError } = await supabase
      .from("job_twin_negotiation_notes")
      .upsert({
        user_id: user.id,
        job_twin_job_id,
        current_offer_salary,
        candidate_desired_salary,
        non_salary_items,
        negotiation_strategy_summary: result.negotiation_strategy_summary,
        negotiation_email_template: result.negotiation_email_template,
        talking_points: result.talking_points,
        last_updated_at: new Date().toISOString(),
      }, { onConflict: "job_twin_job_id" });

    if (upsertError) {
      console.error("Error saving negotiation notes:", upsertError);
    }

    console.log("Negotiation plan generated successfully");
    return new Response(JSON.stringify(result), {
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
