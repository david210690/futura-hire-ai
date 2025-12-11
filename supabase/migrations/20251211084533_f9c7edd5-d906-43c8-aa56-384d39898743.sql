-- Extend job_twin_jobs with recruiter and scheduling fields
ALTER TABLE public.job_twin_jobs
ADD COLUMN IF NOT EXISTS recruiter_name text,
ADD COLUMN IF NOT EXISTS recruiter_email text,
ADD COLUMN IF NOT EXISTS recruiter_linkedin_url text,
ADD COLUMN IF NOT EXISTS contact_channel text,
ADD COLUMN IF NOT EXISTS last_contacted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_action_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_action_type text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Create job_twin_interactions table
CREATE TABLE IF NOT EXISTS public.job_twin_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_twin_job_id uuid NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  channel text,
  direction text DEFAULT 'outbound',
  subject text,
  body text,
  is_sent boolean DEFAULT false,
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  ai_generated boolean DEFAULT true,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create job_twin_negotiation_notes table
CREATE TABLE IF NOT EXISTS public.job_twin_negotiation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_twin_job_id uuid NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  current_offer_salary text,
  candidate_desired_salary text,
  non_salary_items text,
  negotiation_strategy_summary text,
  negotiation_email_template text,
  talking_points text,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(job_twin_job_id)
);

-- Enable RLS
ALTER TABLE public.job_twin_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_twin_negotiation_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_twin_interactions
CREATE POLICY "Users can view own interactions" ON public.job_twin_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interactions" ON public.job_twin_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions" ON public.job_twin_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions" ON public.job_twin_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for job_twin_negotiation_notes
CREATE POLICY "Users can view own negotiation notes" ON public.job_twin_negotiation_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own negotiation notes" ON public.job_twin_negotiation_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own negotiation notes" ON public.job_twin_negotiation_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own negotiation notes" ON public.job_twin_negotiation_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_job_twin_interactions_updated_at
  BEFORE UPDATE ON public.job_twin_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_twin_negotiation_notes_updated_at
  BEFORE UPDATE ON public.job_twin_negotiation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();