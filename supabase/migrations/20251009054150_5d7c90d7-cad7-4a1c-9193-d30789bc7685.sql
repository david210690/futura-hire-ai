-- Create enum for hire recommendation
CREATE TYPE hire_decision AS ENUM ('yes', 'no', 'maybe');

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id),
  interviewer_id UUID REFERENCES public.users(id),
  scheduled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create interview_ratings table
CREATE TABLE public.interview_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  tech_depth INTEGER CHECK (tech_depth >= 0 AND tech_depth <= 100),
  problem_solving INTEGER CHECK (problem_solving >= 0 AND problem_solving <= 100),
  communication INTEGER CHECK (communication >= 0 AND communication <= 100),
  culture_add INTEGER CHECK (culture_add >= 0 AND culture_add <= 100),
  hire_recommend hire_decision NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create predictive_scores table
CREATE TABLE public.predictive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1_heuristic',
  success_probability INTEGER NOT NULL CHECK (success_probability >= 0 AND success_probability <= 100),
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interviews
CREATE POLICY "Org members can view interviews for their jobs"
  ON public.interviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = interviews.job_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "Org members can create interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = interviews.job_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "Org members can update interviews"
  ON public.interviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = interviews.job_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

-- RLS Policies for interview_ratings
CREATE POLICY "Org members can view interview ratings"
  ON public.interview_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.jobs j ON j.id = i.job_id
      WHERE i.id = interview_ratings.interview_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "Org members can create interview ratings"
  ON public.interview_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.jobs j ON j.id = i.job_id
      WHERE i.id = interview_ratings.interview_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "Org members can update interview ratings"
  ON public.interview_ratings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.jobs j ON j.id = i.job_id
      WHERE i.id = interview_ratings.interview_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

-- RLS Policies for predictive_scores
CREATE POLICY "Org members can view predictive scores"
  ON public.predictive_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = predictive_scores.application_id
        AND is_org_member(auth.uid(), j.org_id)
    )
  );

CREATE POLICY "System can manage predictive scores"
  ON public.predictive_scores FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX idx_interview_ratings_interview_id ON public.interview_ratings(interview_id);
CREATE INDEX idx_predictive_scores_application_id ON public.predictive_scores(application_id);

-- Function to compute predictive score
CREATE OR REPLACE FUNCTION public.compute_predictive_score(_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill_fit INTEGER;
  v_culture_fit INTEGER;
  v_confidence INTEGER;
  v_comms INTEGER;
  v_tech_depth INTEGER;
  v_problem_solving INTEGER;
  v_seniority seniority_level;
  v_remote_mode TEXT;
  v_base NUMERIC;
  v_final INTEGER;
  v_rationale TEXT;
  v_score_id UUID;
  v_job_id UUID;
BEGIN
  -- Get application data
  SELECT skill_fit_score, culture_fit_score, job_id
  INTO v_skill_fit, v_culture_fit, v_job_id
  FROM applications
  WHERE id = _application_id;

  -- Get video analysis data (latest)
  SELECT confidence_score, comms_score
  INTO v_confidence, v_comms
  FROM video_analysis va
  JOIN videos v ON v.id = va.video_id
  JOIN applications a ON a.candidate_id = v.candidate_id
  WHERE a.id = _application_id
  ORDER BY va.created_at DESC
  LIMIT 1;

  -- Get interview ratings (latest)
  SELECT ir.tech_depth, ir.problem_solving
  INTO v_tech_depth, v_problem_solving
  FROM interview_ratings ir
  JOIN interviews i ON i.id = ir.interview_id
  WHERE i.candidate_id = (SELECT candidate_id FROM applications WHERE id = _application_id)
    AND i.job_id = v_job_id
  ORDER BY ir.created_at DESC
  LIMIT 1;

  -- Get job metadata
  SELECT seniority, remote_mode
  INTO v_seniority, v_remote_mode
  FROM jobs
  WHERE id = v_job_id;

  -- Compute heuristic score
  v_base := 0.45 * COALESCE(v_skill_fit, 0) + 
            0.25 * COALESCE(v_culture_fit, 0) + 
            0.10 * COALESCE(v_confidence, 0) + 
            0.10 * COALESCE(v_comms, 0);

  -- Add interview bonus if available
  IF v_tech_depth IS NOT NULL THEN
    v_base := v_base + 0.10 * (0.5 * v_tech_depth + 0.5 * v_problem_solving);
  END IF;

  -- Add metadata bonuses
  IF v_seniority = 'senior' THEN
    v_base := v_base + 2;
  END IF;

  IF v_remote_mode = 'remote' THEN
    v_base := v_base + 1;
  END IF;

  -- Clamp to 0-100
  v_final := GREATEST(0, LEAST(100, ROUND(v_base)));

  -- Build rationale
  v_rationale := format(
    'Skill fit: %s, Culture fit: %s, Video confidence: %s, Communication: %s',
    COALESCE(v_skill_fit::TEXT, 'N/A'),
    COALESCE(v_culture_fit::TEXT, 'N/A'),
    COALESCE(v_confidence::TEXT, 'N/A'),
    COALESCE(v_comms::TEXT, 'N/A')
  );

  IF v_tech_depth IS NOT NULL THEN
    v_rationale := v_rationale || format(', Interview tech: %s, problem-solving: %s', v_tech_depth, v_problem_solving);
  END IF;

  -- Insert new score
  INSERT INTO predictive_scores (application_id, version, success_probability, rationale)
  VALUES (_application_id, 'v1_heuristic', v_final, v_rationale)
  RETURNING id INTO v_score_id;

  RETURN v_score_id;
END;
$$;

-- Trigger to recompute predictive score on interview ratings changes
CREATE OR REPLACE FUNCTION public.trigger_recompute_predictive_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id UUID;
BEGIN
  -- Get application_id from interview
  SELECT a.id INTO v_application_id
  FROM applications a
  JOIN interviews i ON i.candidate_id = a.candidate_id AND i.job_id = a.job_id
  WHERE i.id = NEW.interview_id
  LIMIT 1;

  IF v_application_id IS NOT NULL THEN
    PERFORM compute_predictive_score(v_application_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recompute_score_on_interview_rating
  AFTER INSERT OR UPDATE ON public.interview_ratings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_predictive_score();

-- Trigger to recompute on video analysis changes
CREATE OR REPLACE FUNCTION public.trigger_recompute_on_video_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id UUID;
BEGIN
  -- Get application_id from video
  SELECT a.id INTO v_application_id
  FROM applications a
  JOIN videos v ON v.candidate_id = a.candidate_id
  WHERE v.id = NEW.video_id
  LIMIT 1;

  IF v_application_id IS NOT NULL THEN
    PERFORM compute_predictive_score(v_application_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recompute_score_on_video_analysis
  AFTER INSERT OR UPDATE ON public.video_analysis
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_on_video_analysis();