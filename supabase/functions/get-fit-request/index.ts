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
    const url = new URL(req.url);
    const jobTwinJobId = url.searchParams.get("jobTwinJobId");
    const userId = url.searchParams.get("userId");

    if (!jobTwinJobId) {
      return new Response(
        JSON.stringify({ success: false, message: "jobTwinJobId is required" }),
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
    
    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which user ID to query - use provided userId or current user
    const targetUserId = userId || user.id;

    // Fetch latest request for this user + job
    const { data: request, error: fetchError } = await supabaseClient
      .from("role_dna_fit_requests")
      .select(`
        *,
        job_twin_jobs (
          id,
          job_id,
          jobs (
            id,
            title,
            company_id,
            companies (name)
          )
        )
      `)
      .eq("user_id", targetUserId)
      .eq("job_twin_job_id", jobTwinJobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching fit request:", fetchError);
      return new Response(
        JSON.stringify({ success: false, message: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request) {
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job title from nested data
    const jobTitle = request.job_twin_jobs?.jobs?.title || "Unknown Role";
    const companyName = request.job_twin_jobs?.jobs?.companies?.name || "Unknown Company";

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        request: {
          id: request.id,
          status: request.status,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
          requestedByUserId: request.requested_by_user_id,
          jobTwinJobId: request.job_twin_job_id,
          jobTitle,
          companyName,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in get-fit-request:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
