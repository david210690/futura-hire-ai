-- Create enum types
CREATE TYPE public.app_role AS ENUM ('recruiter', 'candidate', 'admin');
CREATE TYPE public.employment_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');
CREATE TYPE public.seniority_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');
CREATE TYPE public.job_status AS ENUM ('open', 'closed');
CREATE TYPE public.application_status AS ENUM ('shortlisted', 'review', 'rejected', 'hired');
CREATE TYPE public.question_source AS ENUM ('auto', 'manual');

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'candidate',
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for company_id in users
ALTER TABLE public.users ADD CONSTRAINT users_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type employment_type NOT NULL DEFAULT 'full-time',
  seniority seniority_level NOT NULL DEFAULT 'mid',
  jd_text TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  years_experience NUMERIC DEFAULT 0,
  skills TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  parsed_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  skill_fit_score INTEGER DEFAULT 0 CHECK (skill_fit_score >= 0 AND skill_fit_score <= 100),
  culture_fit_score INTEGER DEFAULT 0 CHECK (culture_fit_score >= 0 AND culture_fit_score <= 100),
  overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  shortlist_reason TEXT,
  status application_status NOT NULL DEFAULT 'review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- Interview questions table
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  source question_source NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video analysis table
CREATE TABLE public.video_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID UNIQUE NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  transcript TEXT,
  summary TEXT,
  highlights TEXT,
  red_flags TEXT,
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  comms_score INTEGER DEFAULT 0 CHECK (comms_score >= 0 AND comms_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_resumes_candidate_id ON public.resumes(candidate_id);
CREATE INDEX idx_videos_candidate_id ON public.videos(candidate_id);
CREATE INDEX idx_interview_questions_job_id ON public.interview_questions(job_id);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for companies table
CREATE POLICY "Recruiters can view own company" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.company_id = companies.id OR companies.created_by = auth.uid())
    )
  );

CREATE POLICY "Recruiters can create companies" ON public.companies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'recruiter'
    )
  );

CREATE POLICY "Recruiters can update own company" ON public.companies
  FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT USING (status = 'open' OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.company_id = jobs.company_id
    )
  );

CREATE POLICY "Recruiters can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'recruiter'
      AND users.company_id = company_id
    )
  );

CREATE POLICY "Recruiters can update own jobs" ON public.jobs
  FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for candidates table
CREATE POLICY "Candidates can view own profile" ON public.candidates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Recruiters can view candidates via applications" ON public.candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE a.candidate_id = candidates.id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "Candidates can create own profile" ON public.candidates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Candidates can update own profile" ON public.candidates
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for resumes table
CREATE POLICY "Candidates can view own resumes" ON public.resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates 
      WHERE candidates.id = resumes.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can view resumes via applications" ON public.resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE a.candidate_id = resumes.candidate_id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "Candidates can create own resumes" ON public.resumes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates 
      WHERE candidates.id = candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

-- RLS Policies for applications table
CREATE POLICY "Candidates can view own applications" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates 
      WHERE candidates.id = applications.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can view applications for own jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.users u ON u.id = auth.uid()
      WHERE j.id = applications.job_id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "System can create applications" ON public.applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Recruiters can update applications" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.users u ON u.id = auth.uid()
      WHERE j.id = applications.job_id
      AND u.company_id = j.company_id
    )
  );

-- RLS Policies for interview_questions table
CREATE POLICY "Recruiters can view questions for own jobs" ON public.interview_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.users u ON u.id = auth.uid()
      WHERE j.id = interview_questions.job_id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "System can create questions" ON public.interview_questions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Recruiters can update own job questions" ON public.interview_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = interview_questions.job_id
      AND j.created_by = auth.uid()
    )
  );

-- RLS Policies for videos table
CREATE POLICY "Candidates can view own videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates 
      WHERE candidates.id = videos.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can view videos via applications" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE a.candidate_id = videos.candidate_id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "Candidates can create own videos" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates 
      WHERE candidates.id = candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

-- RLS Policies for video_analysis table
CREATE POLICY "Candidates can view own video analysis" ON public.video_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.candidates c ON v.candidate_id = c.id
      WHERE v.id = video_analysis.video_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can view analysis via applications" ON public.video_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.applications a ON a.candidate_id = v.candidate_id
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE v.id = video_analysis.video_id
      AND u.company_id = j.company_id
    )
  );

CREATE POLICY "System can create video analysis" ON public.video_analysis
  FOR INSERT WITH CHECK (true);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'candidate')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets (run after migration)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes
CREATE POLICY "Candidates can upload own resumes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Candidates can view own resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Recruiters can view resumes via applications" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.applications a ON a.candidate_id = c.id
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE c.user_id::text = (storage.foldername(name))[1]
      AND u.company_id = j.company_id
    )
  );

-- Storage policies for videos
CREATE POLICY "Candidates can upload own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Candidates can view own videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Recruiters can view videos via applications" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.applications a ON a.candidate_id = c.id
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.users u ON u.id = auth.uid()
      WHERE c.user_id::text = (storage.foldername(name))[1]
      AND u.company_id = j.company_id
    )
  );