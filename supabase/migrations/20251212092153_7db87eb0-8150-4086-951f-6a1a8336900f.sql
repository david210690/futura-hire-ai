-- Create offer_likelihood_scores table
CREATE TABLE public.offer_likelihood_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL,
  recruiter_user_id UUID NOT NULL,
  shortlist_score_id UUID REFERENCES public.shortlist_predictive_scores(id) ON DELETE SET NULL,
  role_dna_fit_id UUID REFERENCES public.role_dna_fit_scores(id) ON DELETE SET NULL,
  likelihood_score NUMERIC NOT NULL,
  likelihood_band TEXT NOT NULL CHECK (likelihood_band IN ('high', 'medium', 'low')),
  reasoning_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pipeline_health_snapshots table
CREATE TABLE public.pipeline_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  recruiter_user_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for offer_likelihood_scores
CREATE INDEX idx_offer_likelihood_job_candidate ON public.offer_likelihood_scores(job_twin_job_id, candidate_user_id);
CREATE INDEX idx_offer_likelihood_recruiter ON public.offer_likelihood_scores(recruiter_user_id);

-- Create indexes for pipeline_health_snapshots
CREATE INDEX idx_pipeline_health_job ON public.pipeline_health_snapshots(job_twin_job_id);
CREATE INDEX idx_pipeline_health_recruiter ON public.pipeline_health_snapshots(recruiter_user_id);

-- Enable RLS for offer_likelihood_scores
ALTER TABLE public.offer_likelihood_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view offer likelihood for their jobs"
  ON public.offer_likelihood_scores
  FOR SELECT
  USING (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Recruiters can create offer likelihood"
  ON public.offer_likelihood_scores
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "System can manage offer likelihood"
  ON public.offer_likelihood_scores
  FOR ALL
  USING (true);

-- Enable RLS for pipeline_health_snapshots
ALTER TABLE public.pipeline_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view pipeline health"
  ON public.pipeline_health_snapshots
  FOR SELECT
  USING (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Recruiters can create pipeline health"
  ON public.pipeline_health_snapshots
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "System can manage pipeline health"
  ON public.pipeline_health_snapshots
  FOR ALL
  USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_offer_likelihood_scores_updated_at
  BEFORE UPDATE ON public.offer_likelihood_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipeline_health_snapshots_updated_at
  BEFORE UPDATE ON public.pipeline_health_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();