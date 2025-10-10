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
    const { orgSlug } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get org by slug
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("slug", orgSlug)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public jobs for this org
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, slug, location, employment_type, jd_text, tags, created_at, companies(name)")
      .eq("org_id", org.id)
      .eq("is_public", true)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (jobsError) throw jobsError;

    return new Response(
      JSON.stringify({ org, jobs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-public-jobs:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});