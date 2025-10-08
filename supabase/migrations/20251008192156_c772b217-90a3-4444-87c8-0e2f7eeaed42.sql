-- Add AI Career Coach, Bias Analyzer, and Talent Marketing features

-- 1. Career Coach Feedback table
CREATE TABLE IF NOT EXISTS career_coach_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  missing_skills TEXT[],
  resume_suggestions TEXT[],
  interview_questions TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_career_feedback_candidate ON career_coach_feedback(candidate_id, created_at DESC);

ALTER TABLE career_coach_feedback ENABLE ROW LEVEL SECURITY;

-- Candidates can view own feedback
CREATE POLICY "Candidates can view own career feedback"
ON career_coach_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM candidates 
  WHERE candidates.id = career_coach_feedback.candidate_id 
  AND candidates.user_id = auth.uid()
));

-- System can insert feedback
CREATE POLICY "System can insert career feedback"
ON career_coach_feedback FOR INSERT
WITH CHECK (true);

-- 2. Bias Reports table
CREATE TABLE IF NOT EXISTS bias_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  gender_balance TEXT,
  education_balance TEXT,
  skill_balance TEXT,
  diversity_score INTEGER CHECK (diversity_score >= 0 AND diversity_score <= 100),
  issues TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bias_reports_job ON bias_reports(job_id, created_at DESC);

ALTER TABLE bias_reports ENABLE ROW LEVEL SECURITY;

-- Recruiters can view bias reports for own jobs
CREATE POLICY "Recruiters can view bias reports for own jobs"
ON bias_reports FOR SELECT
USING (EXISTS (
  SELECT 1 FROM jobs j
  JOIN users u ON u.id = auth.uid()
  WHERE j.id = bias_reports.job_id
  AND u.company_id = j.company_id
));

-- System can insert bias reports
CREATE POLICY "System can insert bias reports"
ON bias_reports FOR INSERT
WITH CHECK (true);

-- 3. Marketing Assets table
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  linkedin_post TEXT,
  outreach_email TEXT,
  candidate_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_assets_job ON marketing_assets(job_id);

ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

-- Recruiters can view marketing assets for own jobs
CREATE POLICY "Recruiters can view marketing assets for own jobs"
ON marketing_assets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM jobs j
  JOIN users u ON u.id = auth.uid()
  WHERE j.id = marketing_assets.job_id
  AND u.company_id = j.company_id
));

-- Recruiters can insert/update marketing assets for own jobs
CREATE POLICY "Recruiters can insert marketing assets for own jobs"
ON marketing_assets FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM jobs j
  JOIN users u ON u.id = auth.uid()
  WHERE j.id = marketing_assets.job_id
  AND u.company_id = j.company_id
));

CREATE POLICY "Recruiters can update marketing assets for own jobs"
ON marketing_assets FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM jobs j
  JOIN users u ON u.id = auth.uid()
  WHERE j.id = marketing_assets.job_id
  AND u.company_id = j.company_id
));