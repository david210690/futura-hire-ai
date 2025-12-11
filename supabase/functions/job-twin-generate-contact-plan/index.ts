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

    const { job_twin_job_id, profile_id } = await req.json();
    console.log("Generating contact plan for job:", job_twin_job_id);

    // Fetch job details
    const { data: jobTwinJob, error: jobError } = await supabase
      .from("job_twin_jobs")
      .select("*, jobs(title, companies(name))")
      .eq("id", job_twin_job_id)
      .single();

    if (jobError || !jobTwinJob) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing interactions
    const { data: existingInteractions } = await supabase
      .from("job_twin_interactions")
      .select("*")
      .eq("job_twin_job_id", job_twin_job_id)
      .order("created_at", { ascending: false });

    const job = jobTwinJob.jobs;
    const companyName = job?.companies?.name || "the company";
    const hasInitialOutreach = existingInteractions?.some(i => i.interaction_type === "initial_outreach");

    const systemPrompt = `You are an expert career coach helping plan a communication strategy for a job application.

Return JSON:
{
  "plan_summary": "Brief 2-3 sentence summary of the approach",
  "recommended_channel": "email" or "linkedin",
  "tone_recommendation": "friendly", "formal", or "confident",
  "interactions": [
    {
      "type": "initial_outreach" or "follow_up",
      "days_from_now": number,
      "description": "Brief description of this touchpoint"
    }
  ],
  "next_action_type": "initial_outreach" or "follow_up",
  "next_action_days": number
}

Guidelines:
- If no initial outreach yet, start with that
- Plan 2-3 follow-ups spaced 4-7 days apart
- Be strategic but not pushy
- Consider the job status and existing interactions`;

    const userPrompt = `Create a contact plan for:

Job:
- Title: ${job?.title || "Not specified"}
- Company: ${companyName}
- Application Status: ${jobTwinJob.status || "new"}

Existing Interactions: ${existingInteractions?.length || 0}
Has Initial Outreach: ${hasInitialOutreach ? "Yes" : "No"}
Last Contacted: ${jobTwinJob.last_contacted_at || "Never"}
Recruiter Name: ${jobTwinJob.recruiter_name || "Unknown"}
Preferred Channel: ${jobTwinJob.contact_channel || "email"}

Create a strategic contact plan.`;

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
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let plan = {
      plan_summary: "",
      recommended_channel: "email",
      tone_recommendation: "friendly",
      interactions: [] as any[],
      next_action_type: "initial_outreach",
      next_action_days: 0,
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // Calculate next action date
    const nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + (plan.next_action_days || 0));
    // Set to 10 AM in user's timezone (approximation)
    nextActionDate.setHours(10, 0, 0, 0);

    // Update job with next action
    await supabase
      .from("job_twin_jobs")
      .update({
        next_action_at: nextActionDate.toISOString(),
        next_action_type: plan.next_action_type,
      })
      .eq("id", job_twin_job_id);

    // Create planned interactions
    for (const interaction of plan.interactions) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + interaction.days_from_now);
      scheduledDate.setHours(10, 0, 0, 0);

      await supabase
        .from("job_twin_interactions")
        .insert({
          user_id: user.id,
          job_twin_job_id,
          interaction_type: interaction.type,
          channel: plan.recommended_channel,
          direction: "outbound",
          subject: `Planned: ${interaction.description}`,
          body: "",
          is_sent: false,
          scheduled_for: scheduledDate.toISOString(),
          ai_generated: true,
        });
    }

    console.log("Contact plan generated successfully");
    return new Response(JSON.stringify(plan), {
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
