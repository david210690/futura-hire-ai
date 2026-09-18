ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS dimension_scores jsonb;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS critical_red_flags jsonb;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS culture_gate_pass boolean;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS decision text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_culture_gate_on_application_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IN ('shortlisted', 'interview', 'offer', 'hired')
     AND EXISTS (
       SELECT 1
       FROM public.assessments culture_assessment
       WHERE culture_assessment.org_id = NEW.org_id
         AND culture_assessment.is_culture_gate = true
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.assignments culture_assignment
       JOIN public.assessments culture_assessment
         ON culture_assessment.id = culture_assignment.assessment_id
        AND culture_assessment.is_culture_gate = true
       JOIN public.attempts culture_attempt
         ON culture_attempt.assignment_id = culture_assignment.id
        AND culture_attempt.culture_gate_pass = true
       WHERE culture_assignment.application_id = NEW.id
     )
  THEN
    RAISE EXCEPTION 'Culture & Values Assessment must be passed before this candidate can progress to %.', NEW.stage
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;