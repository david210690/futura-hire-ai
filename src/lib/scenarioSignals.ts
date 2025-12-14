import { supabase } from "@/integrations/supabase/client";

export interface ScenarioWarmup {
  id: string;
  department: string;
  seniority: string;
  title: string;
  scenario_context: string;
  choices_json: ScenarioChoice[];
  mapped_role_dna_dimensions: string[];
  nd_safe_notes: string | null;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  why_it_matters: string;
  signals: string[];
}

export interface ScenarioRun {
  id: string;
  scenario_id: string;
  user_id: string;
  job_twin_job_id: string | null;
  selected_choice_id: string;
  free_text_reason: string | null;
  extracted_signals: ExtractedSignals;
  created_at: string;
}

export interface ExtractedSignals {
  signals: string[];
  role_dna_dimensions_touched: string[];
  gentle_interviewer_prompt: string[];
}

export async function getNextScenario(
  department: string,
  seniority: string,
  userId: string
): Promise<ScenarioWarmup | null> {
  // Get scenarios the user hasn't completed yet
  const { data: completedRuns } = await supabase
    .from('scenario_runs')
    .select('scenario_id')
    .eq('user_id', userId);

  const completedIds = (completedRuns || []).map(r => r.scenario_id);

  let query = supabase
    .from('scenario_warmups')
    .select('*')
    .eq('department', department);

  if (seniority) {
    query = query.eq('seniority', seniority);
  }

  if (completedIds.length > 0) {
    query = query.not('id', 'in', `(${completedIds.join(',')})`);
  }

  query = query.limit(1);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scenario:', error);
    return null;
  }

  if (!data || data.length === 0) {
    // If all scenarios completed, return a random one
    const { data: anyScenario } = await supabase
      .from('scenario_warmups')
      .select('*')
      .eq('department', department)
      .limit(1);

    return anyScenario?.[0] ? mapScenario(anyScenario[0]) : null;
  }

  return mapScenario(data[0]);
}

function mapScenario(data: any): ScenarioWarmup {
  return {
    id: data.id,
    department: data.department,
    seniority: data.seniority,
    title: data.title,
    scenario_context: data.scenario_context,
    choices_json: data.choices_json || [],
    mapped_role_dna_dimensions: data.mapped_role_dna_dimensions || [],
    nd_safe_notes: data.nd_safe_notes
  };
}

export async function submitScenarioRun(
  scenarioId: string,
  userId: string,
  selectedChoiceId: string,
  freeTextReason?: string,
  jobTwinJobId?: string
): Promise<{ runId: string; signals: ExtractedSignals }> {
  // Create the run
  const { data: run, error: runError } = await supabase
    .from('scenario_runs')
    .insert({
      scenario_id: scenarioId,
      user_id: userId,
      selected_choice_id: selectedChoiceId,
      free_text_reason: freeTextReason || null,
      job_twin_job_id: jobTwinJobId || null,
      extracted_signals: {}
    })
    .select()
    .single();

  if (runError) throw runError;

  // Call edge function to extract signals
  const { data: signalsData, error: signalsError } = await supabase.functions.invoke(
    'extract-scenario-signals',
    { body: { runId: run.id } }
  );

  if (signalsError) {
    console.error('Error extracting signals:', signalsError);
    // Return basic signals based on choice
    return {
      runId: run.id,
      signals: {
        signals: [],
        role_dna_dimensions_touched: [],
        gentle_interviewer_prompt: []
      }
    };
  }

  return {
    runId: run.id,
    signals: signalsData.signals
  };
}

export async function getUserScenarioRuns(
  userId: string,
  jobTwinJobId?: string
): Promise<ScenarioRun[]> {
  let query = supabase
    .from('scenario_runs')
    .select(`
      *,
      scenario_warmups (
        title,
        department,
        scenario_context,
        choices_json
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (jobTwinJobId) {
    query = query.eq('job_twin_job_id', jobTwinJobId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    scenario_id: r.scenario_id,
    user_id: r.user_id,
    job_twin_job_id: r.job_twin_job_id,
    selected_choice_id: r.selected_choice_id,
    free_text_reason: r.free_text_reason,
    extracted_signals: r.extracted_signals || { signals: [], role_dna_dimensions_touched: [], gentle_interviewer_prompt: [] },
    created_at: r.created_at,
    scenario: r.scenario_warmups
  }));
}
