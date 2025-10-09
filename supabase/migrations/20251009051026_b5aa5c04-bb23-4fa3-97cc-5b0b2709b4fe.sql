-- Create enums
CREATE TYPE public.achievement_kind AS ENUM ('candidate', 'recruiter');
CREATE TYPE public.streak_kind AS ENUM ('candidate', 'recruiter');
CREATE TYPE public.leaderboard_period AS ENUM ('weekly', 'monthly');

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kind public.achievement_kind NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, code)
);

-- Create streaks table
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kind public.streak_kind NOT NULL,
  metric TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_action_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, metric)
);

-- Create leaderboards table
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  period public.leaderboard_period NOT NULL,
  board TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, period, board, user_id)
);

-- Create candidate_progress table
CREATE TABLE public.candidate_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile_completion INTEGER NOT NULL DEFAULT 0,
  has_resume BOOLEAN NOT NULL DEFAULT false,
  has_video BOOLEAN NOT NULL DEFAULT false,
  skills_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recruiter_metrics table
CREATE TABLE public.recruiter_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  jobs_created INTEGER NOT NULL DEFAULT 0,
  shortlists_run INTEGER NOT NULL DEFAULT 0,
  avg_time_to_shortlist NUMERIC,
  diversity_champion_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievements
CREATE POLICY "Users can view their own achievements"
ON public.achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org achievements"
ON public.achievements FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System can create achievements"
ON public.achievements FOR INSERT
WITH CHECK (true);

-- RLS policies for streaks
CREATE POLICY "Users can view their own streaks"
ON public.streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage streaks"
ON public.streaks FOR ALL
USING (true);

-- RLS policies for leaderboards
CREATE POLICY "Org members can view org leaderboards"
ON public.leaderboards FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage leaderboards"
ON public.leaderboards FOR ALL
USING (true);

-- RLS policies for candidate_progress
CREATE POLICY "Candidates can view own progress"
ON public.candidate_progress FOR SELECT
USING (EXISTS (SELECT 1 FROM candidates WHERE id = candidate_id AND user_id = auth.uid()));

CREATE POLICY "System can manage candidate progress"
ON public.candidate_progress FOR ALL
USING (true);

-- RLS policies for recruiter_metrics
CREATE POLICY "Users can view own metrics"
ON public.recruiter_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org metrics"
ON public.recruiter_metrics FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage recruiter metrics"
ON public.recruiter_metrics FOR ALL
USING (true);

-- Function to compute candidate profile completion
CREATE OR REPLACE FUNCTION public.compute_candidate_progress(_candidate_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_score INTEGER := 0;
  v_resume_score INTEGER := 0;
  v_video_score INTEGER := 0;
  v_total INTEGER;
  v_has_resume BOOLEAN;
  v_has_video BOOLEAN;
  v_skills_count INTEGER;
  v_candidate RECORD;
BEGIN
  -- Get candidate data
  SELECT * INTO v_candidate FROM candidates WHERE id = _candidate_id;
  
  -- Profile completeness (30 points): name, headline, skills, summary
  IF v_candidate.full_name IS NOT NULL AND v_candidate.full_name != '' THEN
    v_profile_score := v_profile_score + 8;
  END IF;
  IF v_candidate.headline IS NOT NULL AND v_candidate.headline != '' THEN
    v_profile_score := v_profile_score + 7;
  END IF;
  IF v_candidate.skills IS NOT NULL AND v_candidate.skills != '' THEN
    v_profile_score := v_profile_score + 8;
  END IF;
  IF v_candidate.summary IS NOT NULL AND v_candidate.summary != '' THEN
    v_profile_score := v_profile_score + 7;
  END IF;
  
  -- Resume (40 points)
  SELECT EXISTS (SELECT 1 FROM resumes WHERE candidate_id = _candidate_id) INTO v_has_resume;
  IF v_has_resume THEN
    v_resume_score := 40;
  END IF;
  
  -- Video (30 points)
  SELECT EXISTS (SELECT 1 FROM videos WHERE candidate_id = _candidate_id) INTO v_has_video;
  IF v_has_video THEN
    v_video_score := 30;
  END IF;
  
  -- Skills count
  v_skills_count := COALESCE(array_length(string_to_array(v_candidate.skills, ','), 1), 0);
  
  v_total := v_profile_score + v_resume_score + v_video_score;
  
  -- Upsert progress
  INSERT INTO candidate_progress (
    candidate_id, 
    profile_completion, 
    has_resume, 
    has_video, 
    skills_count,
    updated_at
  )
  VALUES (_candidate_id, v_total, v_has_resume, v_has_video, v_skills_count, now())
  ON CONFLICT (candidate_id)
  DO UPDATE SET
    profile_completion = v_total,
    has_resume = v_has_resume,
    has_video = v_has_video,
    skills_count = v_skills_count,
    updated_at = now();
  
  -- Grant "candidate_verified" achievement if 100% complete
  IF v_total >= 100 THEN
    INSERT INTO achievements (org_id, user_id, kind, code, label, points)
    SELECT 
      (SELECT org_id FROM org_members WHERE user_id = v_candidate.user_id LIMIT 1),
      v_candidate.user_id,
      'candidate',
      'candidate_verified',
      'Verified Candidate',
      100
    ON CONFLICT (org_id, user_id, code) DO NOTHING;
  END IF;
END;
$$;

-- Trigger to update candidate progress
CREATE OR REPLACE FUNCTION public.trigger_update_candidate_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'candidates' THEN
    PERFORM compute_candidate_progress(NEW.id);
  ELSIF TG_TABLE_NAME = 'resumes' THEN
    PERFORM compute_candidate_progress(NEW.candidate_id);
  ELSIF TG_TABLE_NAME = 'videos' THEN
    PERFORM compute_candidate_progress(NEW.candidate_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_candidate_updated
  AFTER INSERT OR UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_candidate_progress();

CREATE TRIGGER on_resume_added
  AFTER INSERT ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_candidate_progress();

CREATE TRIGGER on_video_added
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_candidate_progress();

-- Function to increment recruiter metrics on job creation
CREATE OR REPLACE FUNCTION public.increment_recruiter_job_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO recruiter_metrics (user_id, org_id, jobs_created, updated_at)
  VALUES (NEW.created_by, NEW.org_id, 1, now())
  ON CONFLICT (user_id, org_id)
  DO UPDATE SET
    jobs_created = recruiter_metrics.jobs_created + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_created_increment_metrics
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_recruiter_job_count();

-- Seed badge definitions
INSERT INTO achievements (org_id, user_id, kind, code, label, points)
SELECT o.id, o.owner_id, 'candidate', 'candidate_verified', 'Verified Candidate: Completed profile, resume & intro video', 100
FROM orgs o
WHERE NOT EXISTS (
  SELECT 1 FROM achievements WHERE org_id = o.id AND code = 'candidate_verified'
)
ON CONFLICT DO NOTHING;

-- Add indices
CREATE INDEX idx_achievements_user ON public.achievements(user_id, org_id);
CREATE INDEX idx_achievements_code ON public.achievements(org_id, code);
CREATE INDEX idx_streaks_user_metric ON public.streaks(user_id, metric);
CREATE INDEX idx_leaderboards_org_period_board ON public.leaderboards(org_id, period, board);
CREATE INDEX idx_candidate_progress_candidate ON public.candidate_progress(candidate_id);
CREATE INDEX idx_recruiter_metrics_user_org ON public.recruiter_metrics(user_id, org_id);