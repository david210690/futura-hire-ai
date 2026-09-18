ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_culture_gate boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;

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
        AND culture_attempt.pass = true
       WHERE culture_assignment.application_id = NEW.id
     )
  THEN
    RAISE EXCEPTION 'Culture & Values Assessment must be passed before this candidate can progress to %.', NEW.stage
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_culture_gate_on_application_stage ON public.applications;
CREATE TRIGGER enforce_culture_gate_on_application_stage
BEFORE UPDATE OF stage ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_culture_gate_on_application_stage();