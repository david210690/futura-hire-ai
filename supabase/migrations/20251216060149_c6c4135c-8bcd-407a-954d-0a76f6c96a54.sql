-- Create job_twin_interview_prep table for storing generated interview preparation
CREATE TABLE public.job_twin_interview_prep (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.job_twin_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  questions TEXT[] DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX job_twin_interview_prep_profile_job_idx ON public.job_twin_interview_prep(profile_id, job_id);

-- Enable RLS
ALTER TABLE public.job_twin_interview_prep ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own prep via their profile
CREATE POLICY "Users can view own interview prep" ON public.job_twin_interview_prep
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.job_twin_profiles WHERE user_id = auth.uid())
  );

-- RLS policy: users can insert their own prep
CREATE POLICY "Users can insert own interview prep" ON public.job_twin_interview_prep
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.job_twin_profiles WHERE user_id = auth.uid())
  );

-- RLS policy: users can update their own prep
CREATE POLICY "Users can update own interview prep" ON public.job_twin_interview_prep
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM public.job_twin_profiles WHERE user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_job_twin_interview_prep_updated_at
  BEFORE UPDATE ON public.job_twin_interview_prep
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();