-- Create interview_kits table
CREATE TABLE public.interview_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL,
  recruiter_user_id UUID NOT NULL,
  focus_mode TEXT DEFAULT 'balanced',
  kit_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_interview_kits_job_candidate ON public.interview_kits(job_twin_job_id, candidate_user_id);
CREATE INDEX idx_interview_kits_recruiter ON public.interview_kits(recruiter_user_id);

-- Enable RLS
ALTER TABLE public.interview_kits ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruiters
CREATE POLICY "Recruiters can view interview kits" 
ON public.interview_kits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'recruiter')
  )
);

CREATE POLICY "Recruiters can create interview kits" 
ON public.interview_kits 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'recruiter')
  )
);

CREATE POLICY "Recruiters can update their own interview kits" 
ON public.interview_kits 
FOR UPDATE 
USING (recruiter_user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_interview_kits_updated_at
  BEFORE UPDATE ON public.interview_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();