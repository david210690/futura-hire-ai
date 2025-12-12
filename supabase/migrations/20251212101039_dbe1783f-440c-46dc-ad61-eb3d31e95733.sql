-- Create ai_decision_audit_logs table for transparency and audit
CREATE TABLE public.ai_decision_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_type TEXT NOT NULL,
  job_twin_job_id UUID REFERENCES public.job_twin_jobs(id) ON DELETE SET NULL,
  candidate_user_id UUID,
  recruiter_user_id UUID,
  input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT NOT NULL,
  fairness_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_decision_audit_logs_decision_type ON public.ai_decision_audit_logs(decision_type);
CREATE INDEX idx_ai_decision_audit_logs_job_twin_job_id ON public.ai_decision_audit_logs(job_twin_job_id);
CREATE INDEX idx_ai_decision_audit_logs_candidate_user_id ON public.ai_decision_audit_logs(candidate_user_id);
CREATE INDEX idx_ai_decision_audit_logs_recruiter_user_id ON public.ai_decision_audit_logs(recruiter_user_id);
CREATE INDEX idx_ai_decision_audit_logs_created_at ON public.ai_decision_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_decision_audit_logs ENABLE ROW LEVEL SECURITY;

-- Recruiters can view audit logs for their decisions
CREATE POLICY "Recruiters can view their own audit logs"
ON public.ai_decision_audit_logs
FOR SELECT
USING (auth.uid() = recruiter_user_id);

-- Candidates can view audit logs about them
CREATE POLICY "Candidates can view audit logs about them"
ON public.ai_decision_audit_logs
FOR SELECT
USING (auth.uid() = candidate_user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.ai_decision_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.ai_decision_audit_logs
FOR INSERT
WITH CHECK (true);

-- Comment explaining this is append-only
COMMENT ON TABLE public.ai_decision_audit_logs IS 'Append-only audit log for AI decisions. Do NOT store raw CVs or full transcripts - summaries only.';