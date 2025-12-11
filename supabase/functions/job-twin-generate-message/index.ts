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

    const { message_type, job_twin_job_id, profile_id, tone, notes, last_interaction_summary, days_since_contact, interview_notes } = await req.json();
    console.log("Generating message:", message_type, "for job:", job_twin_job_id);

    // Fetch job details
    const { data: jobTwinJob, error: jobError } = await supabase
      .from("job_twin_jobs")
      .select("*, jobs(title, jd_text, location, seniority, remote_mode, companies(name))")
      .eq("id", job_twin_job_id)
      .single();

    if (jobError || !jobTwinJob) {
      console.error("Job not found:", jobError);
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
      console.error("Profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = jobTwinJob.jobs;
    const companyName = job?.companies?.name || "the company";
    const toneInstruction = tone === "formal" ? "Use a formal, professional tone." : 
                           tone === "confident" ? "Use a confident, assertive tone." : 
                           "Use a friendly, approachable tone.";

    let systemPrompt = "";
    let userPrompt = "";

    switch (message_type) {
      case "initial_outreach":
        systemPrompt = `You are an expert career coach helping a candidate craft an initial outreach message to a recruiter. ${toneInstruction}
        
Return JSON:
{
  "subject": "Email subject line",
  "body": "The message body (100-200 words)"
}

Guidelines:
- Be concise and respectful
- Explain why the candidate is relevant
- Show genuine interest in the role
- Avoid sounding desperate
- Professional but personable`;

        userPrompt = `Write an initial outreach message for:

Candidate:
- Target Role: ${profile.ideal_role || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}
- Career Goals: ${profile.career_goals || "Not specified"}

Job:
- Title: ${job?.title || "Not specified"}
- Company: ${companyName}
- Location: ${job?.location || "Not specified"}

Recruiter: ${jobTwinJob.recruiter_name || "Hiring Manager"}
Channel: ${jobTwinJob.contact_channel || "email"}
${notes ? `Additional notes: ${notes}` : ""}`;
        break;

      case "follow_up":
        systemPrompt = `You are an expert career coach helping a candidate craft a follow-up message. ${toneInstruction}
        
Return JSON:
{
  "subject": "Email subject line",
  "body": "The message body (80-150 words)"
}

Guidelines:
- Polite reminder, not pushy
- Reference previous contact subtly
- Ask for update or next steps
- Keep it brief and respectful`;

        userPrompt = `Write a follow-up message for:

Candidate:
- Target Role: ${profile.ideal_role || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}

Job:
- Title: ${job?.title || "Not specified"}
- Company: ${companyName}

Recruiter: ${jobTwinJob.recruiter_name || "Hiring Manager"}
Days since last contact: ${days_since_contact || "a few days"}
${last_interaction_summary ? `Previous interaction: ${last_interaction_summary}` : ""}
${notes ? `Additional notes: ${notes}` : ""}`;
        break;

      case "thank_you":
        systemPrompt = `You are an expert career coach helping a candidate craft a thank-you message after an interview. ${toneInstruction}
        
Return JSON:
{
  "subject": "Email subject line",
  "body": "The message body (80-150 words)"
}

Guidelines:
- Warm and genuine
- Reference something specific from the conversation if possible
- Reiterate interest in the role
- Keep it concise`;

        userPrompt = `Write a thank-you message for:

Candidate:
- Target Role: ${profile.ideal_role || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}

Job:
- Title: ${job?.title || "Not specified"}
- Company: ${companyName}

Recruiter/Interviewer: ${jobTwinJob.recruiter_name || "the interviewer"}
${interview_notes ? `What was discussed: ${interview_notes}` : ""}
${notes ? `Additional notes: ${notes}` : ""}`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Invalid message type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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

    let result = { subject: "", body: "" };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    console.log("Message generated successfully");
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
