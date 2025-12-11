-- Create interview_simulation_sessions table
CREATE TABLE public.interview_simulation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_twin_job_id UUID REFERENCES public.job_twin_jobs(id) ON DELETE SET NULL,
  role_title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'mixed',
  difficulty TEXT NOT NULL DEFAULT 'mid',
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_questions INTEGER,
  completed_questions INTEGER DEFAULT 0,
  overall_score NUMERIC,
  feedback_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interview_simulation_questions table
CREATE TABLE public.interview_simulation_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_simulation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  ideal_answer_points TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interview_simulation_answers table
CREATE TABLE public.interview_simulation_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_simulation_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.interview_simulation_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  score NUMERIC,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_simulation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_simulation_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view own sessions"
  ON public.interview_simulation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.interview_simulation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.interview_simulation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.interview_simulation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for questions
CREATE POLICY "Users can view own questions"
  ON public.interview_simulation_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own questions"
  ON public.interview_simulation_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
  ON public.interview_simulation_questions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for answers
CREATE POLICY "Users can view own answers"
  ON public.interview_simulation_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own answers"
  ON public.interview_simulation_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
  ON public.interview_simulation_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for interview audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-recordings', 'interview-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for interview recordings
CREATE POLICY "Users can upload own interview recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own interview recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own interview recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update trigger for sessions
CREATE TRIGGER update_interview_simulation_sessions_updated_at
  BEFORE UPDATE ON public.interview_simulation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for questions
CREATE TRIGGER update_interview_simulation_questions_updated_at
  BEFORE UPDATE ON public.interview_simulation_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for answers
CREATE TRIGGER update_interview_simulation_answers_updated_at
  BEFORE UPDATE ON public.interview_simulation_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_interview_sessions_user_id ON public.interview_simulation_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON public.interview_simulation_sessions(status);
CREATE INDEX idx_interview_questions_session_id ON public.interview_simulation_questions(session_id);
CREATE INDEX idx_interview_answers_session_id ON public.interview_simulation_answers(session_id);
CREATE INDEX idx_interview_answers_question_id ON public.interview_simulation_answers(question_id);