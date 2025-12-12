-- Create shortlist_predictive_scores table
CREATE TABLE public.shortlist_predictive_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  role_dna_fit_id UUID REFERENCES public.role_dna_fit_scores(id) ON DELETE SET NULL,
  decision_room_snapshot_id UUID NOT NULL REFERENCES public.job_decision_snapshots(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  reasoning_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_shortlist_predictive_scores_user_id ON public.shortlist_predictive_scores(user_id);
CREATE INDEX idx_shortlist_predictive_scores_job_twin_job_id ON public.shortlist_predictive_scores(job_twin_job_id);
CREATE INDEX idx_shortlist_predictive_scores_snapshot_id ON public.shortlist_predictive_scores(decision_room_snapshot_id);

-- Enable RLS
ALTER TABLE public.shortlist_predictive_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view shortlist scores via job" 
  ON public.shortlist_predictive_scores 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM job_decision_snapshots jds
      JOIN jobs j ON j.id = jds.job_id
      WHERE jds.id = shortlist_predictive_scores.decision_room_snapshot_id
      AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "System can manage shortlist scores" 
  ON public.shortlist_predictive_scores 
  FOR ALL 
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_shortlist_predictive_scores_updated_at
  BEFORE UPDATE ON public.shortlist_predictive_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();