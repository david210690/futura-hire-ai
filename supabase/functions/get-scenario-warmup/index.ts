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
    const action = url.searchParams.get("action") || "next";
    const department = url.searchParams.get("department") || "Engineering";
    const seniority = url.searchParams.get("seniority") || "mid";
    const jobId = url.searchParams.get("jobId");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // ACTION: next - Get next scenario for user
    if (action === "next") {
      // Get scenarios user has completed recently (last 24h)
      const { data: recentRuns } = await supabase
        .from("scenario_runs")
        .select("scenario_id")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const recentScenarioIds = (recentRuns || []).map(r => r.scenario_id);

      // Find an active scenario not done recently
      let query = supabase
        .from("scenario_warmups")
        .select("id, title, scenario_context, choices_json, mapped_role_dna_dimensions, nd_safe_notes")
        .eq("is_active", true)
        .eq("department", department);

      if (seniority) {
        query = query.eq("seniority", seniority);
      }

      if (recentScenarioIds.length > 0) {
        query = query.not("id", "in", `(${recentScenarioIds.join(",")})`);
      }

      const { data: scenarios, error } = await query.limit(10);

      if (error) throw error;

      if (!scenarios || scenarios.length === 0) {
        // Fallback: get any scenario for this department
        const { data: fallbackScenarios } = await supabase
          .from("scenario_warmups")
          .select("id, title, scenario_context, choices_json, mapped_role_dna_dimensions, nd_safe_notes")
          .eq("is_active", true)
          .eq("department", department)
          .limit(5);

        const scenario = fallbackScenarios?.[Math.floor(Math.random() * (fallbackScenarios?.length || 1))] || null;
        
        return new Response(JSON.stringify({ 
          success: true, 
          scenario,
          all_completed: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pick random from available
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

      return new Response(JSON.stringify({ 
        success: true, 
        scenario,
        all_completed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: status - Check if user can do warmup (24h cooldown)
    if (action === "status") {
      let query = supabase
        .from("scenario_runs")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (jobId) {
        query = query.eq("job_twin_job_id", jobId);
      }

      const { data: runs } = await query.limit(1);
      const lastRun = runs?.[0];
      const lastRunAt = lastRun?.created_at || null;

      // Count runs in last 30 days
      const { count: runsCount } = await supabase
        .from("scenario_runs")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Check 24h cooldown
      const cooldownMs = 24 * 60 * 60 * 1000;
      let eligible = true;
      let nextEligibleAt = null;

      if (lastRunAt) {
        const lastRunTime = new Date(lastRunAt).getTime();
        const nextTime = lastRunTime + cooldownMs;
        if (Date.now() < nextTime) {
          eligible = false;
          nextEligibleAt = new Date(nextTime).toISOString();
        }
      }

      return new Response(JSON.stringify({
        success: true,
        eligible,
        nextEligibleAt,
        lastRunAt,
        runsCountLast30Days: runsCount || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ACTION: history - Get user's warmup history
    if (action === "history") {
      let query = supabase
        .from("scenario_runs")
        .select(`
          id,
          created_at,
          selected_choice_id,
          extracted_signals,
          dismissed_by_user,
          scenario_warmups (
            id,
            title
          )
        `)
        .eq("user_id", user.id)
        .eq("dismissed_by_user", false)
        .order("created_at", { ascending: false });

      if (jobId) {
        query = query.eq("job_twin_job_id", jobId);
      }

      const { data: runs, error } = await query.limit(limit);

      if (error) throw error;

      const items = (runs || []).map((run: any) => ({
        runId: run.id,
        createdAt: run.created_at,
        scenarioTitle: run.scenario_warmups?.title || "Unknown Scenario",
        signals: run.extracted_signals?.signals || [],
        reflection: run.extracted_signals?.candidate_friendly_reflection || []
      }));

      return new Response(JSON.stringify({ success: true, items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
