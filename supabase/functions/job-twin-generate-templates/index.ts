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

    console.log("Generating AI templates for user:", user.id);

    // Fetch user's job twin profile
    const { data: profile, error: profileError } = await supabase
      .from("job_twin_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Please set up your Job Twin profile first" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's name from candidates table if available
    const { data: candidate } = await supabase
      .from("candidates")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const userName = candidate?.full_name || "Your Name";
    const skills = profile.skills?.join(", ") || "various technical skills";
    const idealRole = profile.ideal_role || "professional roles";
    const careerGoals = profile.career_goals || "advancing my career";
    const preferences = profile.preferences || {};

    const systemPrompt = `You are an expert career coach creating personalized message templates for a job seeker.
    
The candidate has these details:
- Name: ${userName}
- Target Role: ${idealRole}
- Key Skills: ${skills}
- Career Goals: ${careerGoals}
- Work Preferences: ${JSON.stringify(preferences)}

Generate 8 personalized message templates that reflect their profile. Use their actual skills and goals naturally in the templates.

Return JSON array:
[
  {
    "name": "Template name",
    "template_type": "initial_outreach" | "follow_up" | "thank_you" | "negotiation",
    "channel": "email" | "linkedin",
    "subject": "Subject line (only for email)",
    "body": "Message body with placeholders like {{company_name}}, {{job_title}}, {{recruiter_name}}"
  }
]

Create 2 templates for each type:
- 2 initial_outreach (1 email, 1 linkedin)
- 2 follow_up (1 email, 1 linkedin)  
- 2 thank_you (1 email, 1 linkedin)
- 2 negotiation (both email)

Guidelines:
- Make templates personal to this candidate's skills and goals
- Use professional but personable tone
- Keep messages concise (100-200 words)
- Include natural mentions of their relevant skills
- Use {{placeholder}} format for dynamic values`;

    console.log("Calling AI gateway for template generation...");
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
          { role: "user", content: "Generate the 8 personalized message templates based on my profile." },
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let templates = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        templates = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to generate templates" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generated ${templates.length} templates successfully`);
    return new Response(JSON.stringify({ templates }), {
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
