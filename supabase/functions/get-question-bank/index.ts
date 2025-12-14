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

    const url = new URL(req.url);
    const department = url.searchParams.get("department");
    const category = url.searchParams.get("category");
    const seniority = url.searchParams.get("seniority");
    const roleDnaDimension = url.searchParams.get("roleDnaDimension");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("question_bank_questions")
      .select(`
        *,
        question_bank_answer_rubrics (
          what_good_looks_like,
          followup_probes,
          bias_traps_to_avoid
        )
      `, { count: "exact" });

    if (department) {
      query = query.eq("department", department);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (seniority) {
      query = query.eq("seniority", seniority);
    }
    if (roleDnaDimension) {
      query = query.eq("role_dna_dimension", roleDnaDimension);
    }

    query = query
      .order("department")
      .order("category")
      .order("seniority")
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ 
      questions: data || [],
      total: count || 0,
      limit,
      offset
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-question-bank:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
