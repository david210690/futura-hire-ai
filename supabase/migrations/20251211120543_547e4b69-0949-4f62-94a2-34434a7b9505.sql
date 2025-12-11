-- Create job_decision_snapshots table for AI Decision Room
CREATE TABLE public.job_decision_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  generated_by_user_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_job_decision_snapshots_job_id ON public.job_decision_snapshots(job_id);
CREATE INDEX idx_job_decision_snapshots_created_at ON public.job_decision_snapshots(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.job_decision_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only org members can view/manage decision snapshots for their org's jobs
CREATE POLICY "Org members can view decision snapshots"
ON public.job_decision_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_decision_snapshots.job_id
    AND is_org_member(auth.uid(), j.org_id)
  )
);

CREATE POLICY "Org members can create decision snapshots"
ON public.job_decision_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_decision_snapshots.job_id
    AND is_org_member(auth.uid(), j.org_id)
  )
);

CREATE POLICY "Org members can update decision snapshots"
ON public.job_decision_snapshots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_decision_snapshots.job_id
    AND is_org_member(auth.uid(), j.org_id)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_job_decision_snapshots_updated_at
BEFORE UPDATE ON public.job_decision_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();