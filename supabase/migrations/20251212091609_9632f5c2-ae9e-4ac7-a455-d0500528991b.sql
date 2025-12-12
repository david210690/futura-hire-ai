-- Create interview_prep_plans table
CREATE TABLE public.interview_prep_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  role_dna_fit_id UUID REFERENCES public.role_dna_fit_scores(id) ON DELETE SET NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_interview_prep_plans_user_job ON public.interview_prep_plans(user_id, job_twin_job_id);
CREATE INDEX idx_interview_prep_plans_user_id ON public.interview_prep_plans(user_id);
CREATE INDEX idx_interview_prep_plans_job_twin_job_id ON public.interview_prep_plans(job_twin_job_id);

-- Enable RLS
ALTER TABLE public.interview_prep_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own interview prep plans"
  ON public.interview_prep_plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interview prep plans"
  ON public.interview_prep_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage interview prep plans"
  ON public.interview_prep_plans
  FOR ALL
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_interview_prep_plans_updated_at
  BEFORE UPDATE ON public.interview_prep_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();