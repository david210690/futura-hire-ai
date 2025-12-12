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
    const { candidateUserId, jobTwinJobId } = await req.json();

    if (!candidateUserId || !jobTwinJobId) {
      return new Response(
        JSON.stringify({ success: false, message: "candidateUserId and jobTwinJobId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify JWT and get user (recruiter)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recruiterId = user.id;

    // Verify the recruiter has the recruiter role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", recruiterId)
      .eq("role", "recruiter")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, message: "Only recruiters can request fit checks" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the fit request
    const { data: request, error: insertError } = await supabaseClient
      .from("role_dna_fit_requests")
      .insert({
        user_id: candidateUserId,
        job_twin_job_id: jobTwinJobId,
        requested_by_user_id: recruiterId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating fit request:", insertError);
      return new Response(
        JSON.stringify({ success: false, message: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fit request created:", request.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Fit check request sent.",
        request: {
          id: request.id,
          status: request.status,
          createdAt: request.created_at,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-fit-request:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
