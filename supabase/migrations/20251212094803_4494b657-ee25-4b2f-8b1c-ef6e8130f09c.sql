-- Create hiring_plan_autopilot_snapshots table
CREATE TABLE public.hiring_plan_autopilot_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  recruiter_user_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_hiring_plan_autopilot_job ON public.hiring_plan_autopilot_snapshots(job_twin_job_id);
CREATE INDEX idx_hiring_plan_autopilot_recruiter ON public.hiring_plan_autopilot_snapshots(recruiter_user_id);

-- Enable RLS
ALTER TABLE public.hiring_plan_autopilot_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Recruiters can view their hiring plans"
ON public.hiring_plan_autopilot_snapshots
FOR SELECT
USING (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Recruiters can create hiring plans"
ON public.hiring_plan_autopilot_snapshots
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "System can manage hiring plans"
ON public.hiring_plan_autopilot_snapshots
FOR ALL
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_hiring_plan_autopilot_updated_at
BEFORE UPDATE ON public.hiring_plan_autopilot_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();