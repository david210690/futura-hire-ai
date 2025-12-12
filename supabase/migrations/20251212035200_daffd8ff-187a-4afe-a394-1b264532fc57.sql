-- Create table for Role DNA Fit Scores (candidate fit against role DNA)
CREATE TABLE public.role_dna_fit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  role_dna_snapshot_id UUID REFERENCES public.role_dna_snapshots(id) ON DELETE SET NULL,
  fit_score NUMERIC NOT NULL DEFAULT 0,
  fit_dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_dna_fit_scores ENABLE ROW LEVEL SECURITY;

-- Index for quick lookup by user + job
CREATE INDEX idx_role_dna_fit_scores_user_job ON public.role_dna_fit_scores(user_id, job_twin_job_id);

-- Index on job_twin_job_id
CREATE INDEX idx_role_dna_fit_scores_job ON public.role_dna_fit_scores(job_twin_job_id);

-- Index on created_at for ordering
CREATE INDEX idx_role_dna_fit_scores_created_at ON public.role_dna_fit_scores(created_at DESC);

-- RLS Policies: Users can view and create their own fit scores
CREATE POLICY "Users can view own role dna fit scores"
ON public.role_dna_fit_scores
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own role dna fit scores"
ON public.role_dna_fit_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can manage all fit scores (for edge functions with service role)
CREATE POLICY "System can manage role dna fit scores"
ON public.role_dna_fit_scores
FOR ALL
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_role_dna_fit_scores_updated_at
BEFORE UPDATE ON public.role_dna_fit_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();