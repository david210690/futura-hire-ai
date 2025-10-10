import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgSlug, jobSlug, candidateData } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get job with org
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, org_id, default_assessment_id, video_required, orgs(slug)")
      .eq("slug", jobSlug)
      .eq("orgs.slug", orgSlug)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if candidate exists by email
    let { data: candidate, error: candError } = await supabase
      .from("candidates")
      .select("id, user_id")
      .eq("user_id", candidateData.userId)
      .maybeSingle();

    // Create candidate if doesn't exist
    if (!candidate) {
      const { data: newCandidate, error: createError } = await supabase
        .from("candidates")
        .insert({
          user_id: candidateData.userId,
          full_name: candidateData.name,
          years_experience: candidateData.yearsExperience || 0,
          linkedin_url: candidateData.linkedinUrl,
          skills: candidateData.skills || "",
          headline: candidateData.headline || "",
        })
        .select()
        .single();

      if (createError || !newCandidate) throw createError || new Error("Failed to create candidate");
      candidate = newCandidate;
    }

    // Type guard to ensure candidate exists
    if (!candidate) {
      throw new Error("Failed to create or find candidate");
    }

    // Create application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        org_id: job.org_id,
        job_id: job.id,
        candidate_id: candidate.id,
        status: job.default_assessment_id ? "assessment_pending" : "review",
        video_required: job.video_required || false,
      })
      .select()
      .single();

    if (appError) throw appError;

    // Create assessment assignment if job has default assessment
    if (job.default_assessment_id) {
      await supabase
        .from("assignments")
        .insert({
          assessment_id: job.default_assessment_id,
          candidate_id: candidate.id,
          job_id: job.id,
          application_id: application.id,
          status: "pending",
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        applyToken: application.apply_token,
        orgSlug: orgSlug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in submit-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});