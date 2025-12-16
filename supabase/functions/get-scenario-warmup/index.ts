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
    let department = url.searchParams.get("department") || null;
    let seniority = url.searchParams.get("seniority") || null;
    const jobId = url.searchParams.get("jobId");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // If jobId provided, fetch job details to get department/seniority
    if (jobId && (!department || !seniority)) {
      // Try to fetch from job_twin_jobs -> jobs
      const { data: jobTwinJob } = await supabase
        .from("job_twin_jobs")
        .select(`
          jobs (
            title,
            seniority,
            tags,
            companies (name)
          )
        `)
        .eq("id", jobId)
        .single();

      if (jobTwinJob?.jobs) {
        const job = jobTwinJob.jobs as any;
        // Infer department from job title or tags
        const jobTitle = (job.title || "").toLowerCase();
        const tags = (job.tags || []).map((t: string) => t.toLowerCase());
        
        // Map job characteristics to department
        if (jobTitle.includes("engineer") || jobTitle.includes("developer") || tags.includes("engineering")) {
          department = department || "Engineering";
        } else if (jobTitle.includes("sales") || tags.includes("sales")) {
          department = department || "Sales";
        } else if (jobTitle.includes("product") || jobTitle.includes("pm")) {
          department = department || "Product";
        } else if (jobTitle.includes("design") || jobTitle.includes("ux") || tags.includes("design")) {
          department = department || "Design";
        } else if (jobTitle.includes("marketing") || tags.includes("marketing")) {
          department = department || "Marketing";
        } else if (jobTitle.includes("operations") || jobTitle.includes("ops")) {
          department = department || "Operations";
        } else if (jobTitle.includes("hr") || jobTitle.includes("people") || jobTitle.includes("talent")) {
          department = department || "HR";
        } else if (jobTitle.includes("finance") || jobTitle.includes("accounting")) {
          department = department || "Finance";
        } else if (jobTitle.includes("lead") || jobTitle.includes("manager") || jobTitle.includes("director") || jobTitle.includes("head")) {
          department = department || "Leadership";
        } else {
          department = department || "General";
        }

        // Map seniority
        const seniorityLevel = job.seniority || "";
        if (seniorityLevel === "junior" || seniorityLevel === "entry") {
          seniority = seniority || "junior";
        } else if (seniorityLevel === "senior" || seniorityLevel === "lead") {
          seniority = seniority || "senior";
        } else {
          seniority = seniority || "mid";
        }
      }
    }

    // Default fallbacks
    department = department || "General";
    seniority = seniority || "mid";

    console.log(`Fetching warmup for department: ${department}, seniority: ${seniority}, jobId: ${jobId || 'none'}`);

    // ACTION: next - Get next scenario for user
    if (action === "next") {
      // Get scenarios user has completed recently (last 24h)
      const { data: recentRuns } = await supabase
        .from("scenario_runs")
        .select("scenario_id")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const recentScenarioIds = (recentRuns || []).map(r => r.scenario_id);

      // Find an active scenario matching department
      let query = supabase
        .from("scenario_warmups")
        .select("id, title, scenario_context, choices_json, mapped_role_dna_dimensions, nd_safe_notes, department")
        .eq("is_active", true);

      // Try exact department match first
      let { data: scenarios, error } = await query
        .eq("department", department)
        .not("id", "in", recentScenarioIds.length > 0 ? `(${recentScenarioIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)");

      if (error) throw error;

      // If no scenarios for exact department, try General
      if (!scenarios || scenarios.length === 0) {
        const { data: generalScenarios } = await supabase
          .from("scenario_warmups")
          .select("id, title, scenario_context, choices_json, mapped_role_dna_dimensions, nd_safe_notes, department")
          .eq("is_active", true)
          .eq("department", "General")
          .not("id", "in", recentScenarioIds.length > 0 ? `(${recentScenarioIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)");
        
        scenarios = generalScenarios;
      }

      // If still no scenarios, get any active scenario
      if (!scenarios || scenarios.length === 0) {
        const { data: anyScenarios } = await supabase
          .from("scenario_warmups")
          .select("id, title, scenario_context, choices_json, mapped_role_dna_dimensions, nd_safe_notes, department")
          .eq("is_active", true)
          .limit(10);
        
        scenarios = anyScenarios;
      }

      if (!scenarios || scenarios.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          scenario: null,
          all_completed: true,
          message: "No scenarios available"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pick random from available
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

      return new Response(JSON.stringify({ 
        success: true, 
        scenario,
        department,
        seniority,
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
