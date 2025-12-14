-- Create calibration_checks table for tracking IRR and calibration insights
CREATE TABLE public.calibration_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  discrepancies JSONB NOT NULL DEFAULT '[]',
  bias_flags JSONB NOT NULL DEFAULT '[]',
  evidence_gaps JSONB NOT NULL DEFAULT '[]',
  interviewer_action TEXT CHECK (interviewer_action IN ('revised', 'confirmed', 'pending')),
  justification_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.calibration_checks ENABLE ROW LEVEL SECURITY;

-- Recruiters in the same org can view calibration checks for their jobs
CREATE POLICY "Recruiters can view calibration checks for their org jobs"
ON public.calibration_checks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.org_members om ON om.org_id = j.org_id
    WHERE j.id = calibration_checks.job_id
    AND om.user_id = auth.uid()
  )
);

-- Interviewers can insert their own calibration checks
CREATE POLICY "Interviewers can insert their calibration checks"
ON public.calibration_checks
FOR INSERT
WITH CHECK (interviewer_id = auth.uid());

-- Interviewers can update their own calibration checks
CREATE POLICY "Interviewers can update their calibration checks"
ON public.calibration_checks
FOR UPDATE
USING (interviewer_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_calibration_checks_job ON public.calibration_checks(job_id);
CREATE INDEX idx_calibration_checks_candidate ON public.calibration_checks(candidate_id);
CREATE INDEX idx_calibration_checks_interviewer ON public.calibration_checks(interviewer_id);