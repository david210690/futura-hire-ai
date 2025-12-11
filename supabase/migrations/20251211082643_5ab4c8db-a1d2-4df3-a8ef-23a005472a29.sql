-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create job twin profiles table
CREATE TABLE public.job_twin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ideal_role TEXT,
  skills TEXT[],
  career_goals TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create job twin matched jobs table with status tracking
CREATE TABLE public.job_twin_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.job_twin_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score INTEGER DEFAULT 0,
  match_reasons TEXT[],
  status TEXT NOT NULL DEFAULT 'new',
  applied_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, job_id)
);

-- Create indexes
CREATE INDEX idx_job_twin_jobs_status ON public.job_twin_jobs(status);
CREATE INDEX idx_job_twin_jobs_profile ON public.job_twin_jobs(profile_id);

-- Enable RLS
ALTER TABLE public.job_twin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_twin_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own job twin profile"
  ON public.job_twin_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job twin profile"
  ON public.job_twin_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job twin profile"
  ON public.job_twin_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for matched jobs
CREATE POLICY "Users can view own matched jobs"
  ON public.job_twin_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.job_twin_profiles p 
    WHERE p.id = job_twin_jobs.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own matched jobs"
  ON public.job_twin_jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.job_twin_profiles p 
    WHERE p.id = job_twin_jobs.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can manage job twin jobs"
  ON public.job_twin_jobs FOR ALL
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_job_twin_profiles_updated_at
  BEFORE UPDATE ON public.job_twin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();