-- Add archive support to question_bank_questions
ALTER TABLE public.question_bank_questions 
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create index for archive filtering
CREATE INDEX IF NOT EXISTS idx_question_bank_questions_archived 
ON public.question_bank_questions(is_archived);

-- Update trigger for updated_at
CREATE TRIGGER update_question_bank_questions_updated_at
BEFORE UPDATE ON public.question_bank_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policy for admin/recruiter access
CREATE POLICY "Admins and recruiters can manage questions"
ON public.question_bank_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recruiter'::app_role));

-- Add updated_at to rubrics table
ALTER TABLE public.question_bank_answer_rubrics
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER update_question_bank_answer_rubrics_updated_at
BEFORE UPDATE ON public.question_bank_answer_rubrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();