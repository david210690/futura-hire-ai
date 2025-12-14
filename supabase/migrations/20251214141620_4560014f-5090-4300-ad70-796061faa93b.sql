-- Part 1: Question Bank Questions
CREATE TABLE public.question_bank_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('behavioral', 'role_specific', 'execution', 'culture_nd_safe')),
  seniority TEXT NOT NULL CHECK (seniority IN ('intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'exec')),
  question_text TEXT NOT NULL,
  intent TEXT NOT NULL,
  role_dna_dimension TEXT NOT NULL CHECK (role_dna_dimension IN ('cognitive_patterns', 'communication_style', 'execution_style', 'problem_solving_vectors', 'culture_alignment', 'success_signals')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('low', 'medium', 'high')),
  nd_safe BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for question_bank_questions
CREATE INDEX idx_question_bank_dept_cat_sen ON public.question_bank_questions(department, category, seniority);
CREATE INDEX idx_question_bank_role_dna ON public.question_bank_questions(role_dna_dimension);

-- Part 2: Question Bank Answer Rubrics
CREATE TABLE public.question_bank_answer_rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  what_good_looks_like JSONB NOT NULL DEFAULT '[]'::jsonb,
  followup_probes JSONB NOT NULL DEFAULT '[]'::jsonb,
  bias_traps_to_avoid JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_rubrics_question ON public.question_bank_answer_rubrics(question_id);

-- Part 3: Scenario Warmups
CREATE TABLE public.scenario_warmups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  seniority TEXT NOT NULL CHECK (seniority IN ('intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'exec')),
  title TEXT NOT NULL,
  scenario_context TEXT NOT NULL,
  choices_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  mapped_role_dna_dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  nd_safe_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenario_warmups_dept_sen ON public.scenario_warmups(department, seniority);

-- Part 4: Scenario Runs
CREATE TABLE public.scenario_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenario_warmups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_twin_job_id UUID REFERENCES public.job_twin_jobs(id),
  selected_choice_id TEXT NOT NULL,
  free_text_reason TEXT,
  extracted_signals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenario_runs_user ON public.scenario_runs(user_id);
CREATE INDEX idx_scenario_runs_job ON public.scenario_runs(job_twin_job_id);

-- Part 5: Interview Question Recommendations
CREATE TABLE public.interview_question_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES auth.users(id),
  generated_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  recommendations_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_recs_job_cand ON public.interview_question_recommendations(job_twin_job_id, candidate_user_id);

-- RLS Policies
ALTER TABLE public.question_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_answer_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_warmups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_question_recommendations ENABLE ROW LEVEL SECURITY;

-- Question Bank - viewable by all authenticated, editable by recruiters
CREATE POLICY "Authenticated users can view questions"
  ON public.question_bank_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters can create questions"
  ON public.question_bank_questions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters can update questions"
  ON public.question_bank_questions FOR UPDATE
  USING (has_role(auth.uid(), 'recruiter'));

-- Rubrics - viewable by all authenticated, editable by recruiters
CREATE POLICY "Authenticated users can view rubrics"
  ON public.question_bank_answer_rubrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters can manage rubrics"
  ON public.question_bank_answer_rubrics FOR ALL
  USING (has_role(auth.uid(), 'recruiter'));

-- Scenario Warmups - viewable by all authenticated
CREATE POLICY "Authenticated users can view warmups"
  ON public.scenario_warmups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters can manage warmups"
  ON public.scenario_warmups FOR ALL
  USING (has_role(auth.uid(), 'recruiter'));

-- Scenario Runs - users can view/create their own
CREATE POLICY "Users can view own scenario runs"
  ON public.scenario_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenario runs"
  ON public.scenario_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can view all scenario runs"
  ON public.scenario_runs FOR SELECT
  USING (has_role(auth.uid(), 'recruiter'));

CREATE POLICY "System can update scenario runs"
  ON public.scenario_runs FOR UPDATE
  USING (true);

-- Interview Recommendations - recruiters can manage
CREATE POLICY "Recruiters can view recommendations"
  ON public.interview_question_recommendations FOR SELECT
  USING (has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters can create recommendations"
  ON public.interview_question_recommendations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'recruiter'));

CREATE POLICY "System can manage recommendations"
  ON public.interview_question_recommendations FOR ALL
  USING (true);