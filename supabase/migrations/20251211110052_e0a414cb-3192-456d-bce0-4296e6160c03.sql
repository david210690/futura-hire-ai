-- Voice Interview Sessions table
CREATE TABLE public.voice_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_twin_job_id UUID REFERENCES public.job_twin_jobs(id) ON DELETE SET NULL,
  retell_session_id TEXT,
  mode TEXT NOT NULL DEFAULT 'mixed',
  difficulty TEXT NOT NULL DEFAULT 'mid',
  status TEXT NOT NULL DEFAULT 'pending',
  role_title TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  overall_score NUMERIC,
  feedback_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice Interview Turns table
CREATE TABLE public.voice_interview_turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.voice_interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_interview_turns ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_interview_sessions
CREATE POLICY "Users can view own voice interview sessions"
ON public.voice_interview_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice interview sessions"
ON public.voice_interview_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice interview sessions"
ON public.voice_interview_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can manage voice interview sessions"
ON public.voice_interview_sessions
FOR ALL
USING (true);

-- RLS policies for voice_interview_turns
CREATE POLICY "Users can view own voice interview turns"
ON public.voice_interview_turns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice interview turns"
ON public.voice_interview_turns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage voice interview turns"
ON public.voice_interview_turns
FOR ALL
USING (true);

-- Indexes for performance
CREATE INDEX idx_voice_interview_sessions_user_id ON public.voice_interview_sessions(user_id);
CREATE INDEX idx_voice_interview_sessions_retell_session_id ON public.voice_interview_sessions(retell_session_id);
CREATE INDEX idx_voice_interview_sessions_job_twin_job_id ON public.voice_interview_sessions(job_twin_job_id);
CREATE INDEX idx_voice_interview_turns_session_id ON public.voice_interview_turns(session_id);

-- Trigger to update updated_at
CREATE TRIGGER update_voice_interview_sessions_updated_at
BEFORE UPDATE ON public.voice_interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_interview_turns_updated_at
BEFORE UPDATE ON public.voice_interview_turns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();