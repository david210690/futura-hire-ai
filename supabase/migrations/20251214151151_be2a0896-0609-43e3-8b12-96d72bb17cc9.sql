-- Add dismissed_by_user column to scenario_runs
ALTER TABLE public.scenario_runs 
ADD COLUMN IF NOT EXISTS dismissed_by_user boolean NOT NULL DEFAULT false;

-- Create index for querying non-dismissed runs
CREATE INDEX IF NOT EXISTS idx_scenario_runs_dismissed ON public.scenario_runs(user_id, dismissed_by_user);