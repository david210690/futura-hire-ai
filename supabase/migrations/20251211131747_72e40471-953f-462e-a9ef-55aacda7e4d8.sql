-- Create role_dna_snapshots table for AI-generated Role DNA blueprints
CREATE TABLE public.role_dna_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  generated_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.role_dna_snapshots IS 'Stores AI-generated Role DNA snapshots for jobs';
COMMENT ON COLUMN public.role_dna_snapshots.snapshot_json IS 'Full AI-generated Role DNA JSON blueprint';

-- Create indexes for efficient queries
CREATE INDEX idx_role_dna_snapshots_job_twin_job_id ON public.role_dna_snapshots(job_twin_job_id);
CREATE INDEX idx_role_dna_snapshots_generated_by_user_id ON public.role_dna_snapshots(generated_by_user_id);
CREATE INDEX idx_role_dna_snapshots_created_at ON public.role_dna_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.role_dna_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own snapshots
CREATE POLICY "Users can view own role dna snapshots"
  ON public.role_dna_snapshots
  FOR SELECT
  USING (auth.uid() = generated_by_user_id);

CREATE POLICY "Users can create role dna snapshots"
  ON public.role_dna_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = generated_by_user_id);

CREATE POLICY "Users can update own role dna snapshots"
  ON public.role_dna_snapshots
  FOR UPDATE
  USING (auth.uid() = generated_by_user_id);

CREATE POLICY "Users can delete own role dna snapshots"
  ON public.role_dna_snapshots
  FOR DELETE
  USING (auth.uid() = generated_by_user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_role_dna_snapshots_updated_at
  BEFORE UPDATE ON public.role_dna_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();