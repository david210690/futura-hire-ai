-- Create enums for assessments (skip question_source as it exists)
CREATE TYPE assessment_purpose AS ENUM ('screening', 'skills', 'culture', 'coding');
CREATE TYPE question_type AS ENUM ('mcq', 'free_text', 'coding');
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE assignment_status AS ENUM ('pending', 'invited', 'started', 'submitted', 'graded', 'expired');
CREATE TYPE import_format AS ENUM ('pdf', 'csv', 'json');

-- Assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose assessment_purpose NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_points INTEGER NOT NULL DEFAULT 100,
  shuffle BOOLEAN NOT NULL DEFAULT true,
  passing_score INTEGER NOT NULL DEFAULT 70,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assessments"
  ON public.assessments FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org recruiters can create assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND is_org_member(auth.uid(), org_id));

CREATE POLICY "Org recruiters can update assessments"
  ON public.assessments FOR UPDATE
  USING (is_org_member(auth.uid(), org_id));

-- Assessment sections
CREATE TABLE public.assessment_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.assessment_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections for accessible assessments"
  ON public.assessment_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assessments
    WHERE assessments.id = assessment_sections.assessment_id
    AND is_org_member(auth.uid(), assessments.org_id)
  ));

CREATE POLICY "System can manage sections"
  ON public.assessment_sections FOR ALL
  USING (true);

-- Question bank
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  source question_source NOT NULL DEFAULT 'auto',
  role_tag TEXT,
  skill_tags TEXT[],
  type question_type NOT NULL,
  difficulty question_difficulty NOT NULL,
  question TEXT NOT NULL,
  options JSONB,
  answer_key JSONB,
  rubric JSONB,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view question bank"
  ON public.question_bank FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org recruiters can create questions"
  ON public.question_bank FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND is_org_member(auth.uid(), org_id));

CREATE POLICY "Org recruiters can update questions"
  ON public.question_bank FOR UPDATE
  USING (is_org_member(auth.uid(), org_id));

CREATE INDEX idx_question_bank_tags ON public.question_bank USING GIN(skill_tags);
CREATE INDEX idx_question_bank_org_source ON public.question_bank(org_id, source);

-- Assessment questions (junction table)
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.assessment_sections(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions for accessible assessments"
  ON public.assessment_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assessments
    WHERE assessments.id = assessment_questions.assessment_id
    AND is_org_member(auth.uid(), assessments.org_id)
  ));

CREATE POLICY "System can manage assessment questions"
  ON public.assessment_questions FOR ALL
  USING (true);

CREATE INDEX idx_assessment_questions_order ON public.assessment_questions(assessment_id, order_index);

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their assignments"
  ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.candidates
    WHERE candidates.id = assignments.candidate_id
    AND candidates.user_id = auth.uid()
  ));

CREATE POLICY "Org members can view assignments"
  ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assessments
    WHERE assessments.id = assignments.assessment_id
    AND is_org_member(auth.uid(), assessments.org_id)
  ));

CREATE POLICY "Org recruiters can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments
    WHERE assessments.id = assignments.assessment_id
    AND is_org_member(auth.uid(), assessments.org_id)
  ));

CREATE POLICY "System can update assignments"
  ON public.assignments FOR UPDATE
  USING (true);

CREATE INDEX idx_assignments_candidate ON public.assignments(candidate_id);
CREATE INDEX idx_assignments_application ON public.assignments(application_id);

-- Attempts
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  ip_addr TEXT,
  ua TEXT,
  proctor_score INTEGER DEFAULT 100,
  ai_grade INTEGER,
  human_override_grade INTEGER,
  final_grade INTEGER,
  pass BOOLEAN
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their attempts"
  ON public.attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.candidates c ON c.id = a.candidate_id
    WHERE a.id = attempts.assignment_id
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Org members can view attempts"
  ON public.attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.assessments asmt ON asmt.id = a.assessment_id
    WHERE a.id = attempts.assignment_id
    AND is_org_member(auth.uid(), asmt.org_id)
  ));

CREATE POLICY "System can manage attempts"
  ON public.attempts FOR ALL
  USING (true);

CREATE INDEX idx_attempts_assignment ON public.attempts(assignment_id);

-- Attempt answers
CREATE TABLE public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  auto_score INTEGER,
  ai_feedback TEXT,
  is_flagged BOOLEAN DEFAULT false
);

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their answers"
  ON public.attempt_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.attempts att
    JOIN public.assignments a ON a.id = att.assignment_id
    JOIN public.candidates c ON c.id = a.candidate_id
    WHERE att.id = attempt_answers.attempt_id
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Org members can view answers"
  ON public.attempt_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.attempts att
    JOIN public.assignments a ON a.id = att.assignment_id
    JOIN public.assessments asmt ON asmt.id = a.assessment_id
    WHERE att.id = attempt_answers.attempt_id
    AND is_org_member(auth.uid(), asmt.org_id)
  ));

CREATE POLICY "System can manage answers"
  ON public.attempt_answers FOR ALL
  USING (true);

-- Proctor events
CREATE TABLE public.proctor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proctor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view proctor events"
  ON public.proctor_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.attempts att
    JOIN public.assignments a ON a.id = att.assignment_id
    JOIN public.assessments asmt ON asmt.id = a.assessment_id
    WHERE att.id = proctor_events.attempt_id
    AND is_org_member(auth.uid(), asmt.org_id)
  ));

CREATE POLICY "System can create proctor events"
  ON public.proctor_events FOR INSERT
  WITH CHECK (true);

-- Imports
CREATE TABLE public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  format import_format NOT NULL,
  parsed JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view imports"
  ON public.imports FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage imports"
  ON public.imports FOR ALL
  USING (true);

-- Assessment reports
CREATE TABLE public.assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reports"
  ON public.assessment_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assessments
    WHERE assessments.id = assessment_reports.assessment_id
    AND is_org_member(auth.uid(), assessments.org_id)
  ));

CREATE POLICY "System can create reports"
  ON public.assessment_reports FOR INSERT
  WITH CHECK (true);

-- Add entitlements for assessments
INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT id, 'feature_assessments', true, NULL FROM public.orgs
ON CONFLICT (org_id, feature) DO NOTHING;

INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT id, 'limits_assessment_invites_per_day', true, '50' FROM public.orgs
ON CONFLICT (org_id, feature) DO NOTHING;

INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT id, 'limits_assessment_ai_grades_per_day', true, '100' FROM public.orgs
ON CONFLICT (org_id, feature) DO NOTHING;