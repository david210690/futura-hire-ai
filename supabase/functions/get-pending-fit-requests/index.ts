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

    // Fetch all pending requests for this user
    const { data: requests, error: fetchError } = await supabaseClient
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
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching pending fit requests:", fetchError);
      return new Response(
        JSON.stringify({ success: false, message: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform the data
    const transformedRequests = (requests || []).map((request) => ({
      id: request.id,
      status: request.status,
      createdAt: request.created_at,
      jobTwinJobId: request.job_twin_job_id,
      jobTitle: request.job_twin_jobs?.jobs?.title || "Unknown Role",
      companyName: request.job_twin_jobs?.jobs?.companies?.name || "Unknown Company",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        requests: transformedRequests,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in get-pending-fit-requests:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
