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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const url = new URL(req.url);
    const department = url.searchParams.get("department") || "Engineering";
    const seniority = url.searchParams.get("seniority");

    // Get scenarios the user hasn't completed yet
    const { data: completedRuns } = await supabase
      .from("scenario_runs")
      .select("scenario_id")
      .eq("user_id", user.id);

    const completedIds = (completedRuns || []).map(r => r.scenario_id);

    let query = supabase
      .from("scenario_warmups")
      .select("*")
      .eq("department", department);

    if (seniority) {
      query = query.eq("seniority", seniority);
    }

    if (completedIds.length > 0) {
      query = query.not("id", "in", `(${completedIds.join(",")})`);
    }

    query = query.limit(1);

    const { data: scenarios, error } = await query;

    if (error) throw error;

    if (!scenarios || scenarios.length === 0) {
      // Return a random one if all completed
      const { data: anyScenario } = await supabase
        .from("scenario_warmups")
        .select("*")
        .eq("department", department)
        .limit(1);

      return new Response(JSON.stringify({ 
        scenario: anyScenario?.[0] || null,
        all_completed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      scenario: scenarios[0],
      all_completed: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-scenario-warmup:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
