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
    const { token } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get application with all related data
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        *,
        jobs(id, title, slug, location),
        orgs(id, name, slug),
        candidates(id, full_name, skills),
        assignments(id, status, assessment_id, assessments(name, description)),
        videos(id, status, created_at)
      `)
      .eq("apply_token", token)
      .maybeSingle();

    if (!application) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (appError) throw appError;

    // Determine next action
    let nextAction = null;
    let nextActionLabel = null;

    if (application.status === "assessment_pending") {
      nextAction = "assessment";
      nextActionLabel = "Start Assessment";
    } else if (application.status === "video_pending") {
      nextAction = "video";
      nextActionLabel = "Record Video Introduction";
    }

    return new Response(
      JSON.stringify({ 
        application,
        nextAction,
        nextActionLabel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-candidate-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});