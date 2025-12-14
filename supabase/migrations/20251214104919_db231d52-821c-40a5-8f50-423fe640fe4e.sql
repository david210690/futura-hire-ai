-- Create role_launch_snapshots table to store agent-generated launch content
CREATE TABLE public.role_launch_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  role_dna_snapshot_id UUID REFERENCES public.role_dna_snapshots(id) ON DELETE SET NULL,
  recruiter_user_id UUID NOT NULL,
  
  -- Launch settings
  posting_budget TEXT NOT NULL DEFAULT 'medium',
  outreach_tone TEXT NOT NULL DEFAULT 'professional',
  timezone_priority TEXT NOT NULL DEFAULT 'global',
  
  -- Generated content
  job_descriptions JSONB NOT NULL DEFAULT '[]',
  outreach_templates JSONB NOT NULL DEFAULT '[]',
  scenario_warmup_config JSONB DEFAULT NULL,
  
  -- Execution status
  status TEXT NOT NULL DEFAULT 'draft',
  launched_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_launch_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own role launches"
ON public.role_launch_snapshots
FOR SELECT
USING (auth.uid() = recruiter_user_id);

CREATE POLICY "Users can create their own role launches"
ON public.role_launch_snapshots
FOR INSERT
WITH CHECK (auth.uid() = recruiter_user_id);

CREATE POLICY "Users can update their own role launches"
ON public.role_launch_snapshots
FOR UPDATE
USING (auth.uid() = recruiter_user_id);

CREATE POLICY "Users can delete their own role launches"
ON public.role_launch_snapshots
FOR DELETE
USING (auth.uid() = recruiter_user_id);

-- Create index for efficient queries
CREATE INDEX idx_role_launch_snapshots_job_id ON public.role_launch_snapshots(job_twin_job_id);
CREATE INDEX idx_role_launch_snapshots_recruiter ON public.role_launch_snapshots(recruiter_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_role_launch_snapshots_updated_at
BEFORE UPDATE ON public.role_launch_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();