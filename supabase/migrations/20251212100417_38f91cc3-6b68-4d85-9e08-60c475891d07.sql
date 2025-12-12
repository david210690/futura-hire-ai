-- Create autopilot action logs table
CREATE TABLE public.autopilot_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recruiter_user_id UUID NOT NULL,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  candidate_user_id UUID,
  action_type TEXT NOT NULL,
  action_payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_autopilot_action_logs_recruiter ON public.autopilot_action_logs(recruiter_user_id);
CREATE INDEX idx_autopilot_action_logs_job ON public.autopilot_action_logs(job_twin_job_id);
CREATE INDEX idx_autopilot_action_logs_candidate ON public.autopilot_action_logs(candidate_user_id);
CREATE INDEX idx_autopilot_action_logs_created ON public.autopilot_action_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.autopilot_action_logs ENABLE ROW LEVEL SECURITY;

-- Recruiters can view their own action logs
CREATE POLICY "Recruiters can view own action logs"
ON public.autopilot_action_logs
FOR SELECT
USING (auth.uid() = recruiter_user_id);

-- Recruiters can create action logs
CREATE POLICY "Recruiters can create action logs"
ON public.autopilot_action_logs
FOR INSERT
WITH CHECK (auth.uid() = recruiter_user_id);

-- System can manage action logs
CREATE POLICY "System can manage action logs"
ON public.autopilot_action_logs
FOR ALL
USING (true);