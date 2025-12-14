-- Add missing columns to scenario_warmups
ALTER TABLE public.scenario_warmups 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing column to scenario_runs
ALTER TABLE public.scenario_runs 
ADD COLUMN IF NOT EXISTS explainability JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scenario_warmups_department ON public.scenario_warmups(department);
CREATE INDEX IF NOT EXISTS idx_scenario_warmups_seniority ON public.scenario_warmups(seniority);
CREATE INDEX IF NOT EXISTS idx_scenario_warmups_is_active ON public.scenario_warmups(is_active);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_user_id ON public.scenario_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_job_twin_job_id ON public.scenario_runs(job_twin_job_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario_id ON public.scenario_runs(scenario_id);

-- Add updated_at trigger for scenario_warmups
DROP TRIGGER IF EXISTS update_scenario_warmups_updated_at ON public.scenario_warmups;
CREATE TRIGGER update_scenario_warmups_updated_at
  BEFORE UPDATE ON public.scenario_warmups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();