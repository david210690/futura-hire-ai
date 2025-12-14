-- Create career_blueprint_snapshots table for storing growth blueprints
CREATE TABLE public.career_blueprint_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_role_1 TEXT NOT NULL,
  target_role_2 TEXT,
  target_role_1_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  target_role_2_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  blueprint_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_blueprint_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only view their own blueprints (confidential)
CREATE POLICY "Users can view own career blueprints"
ON public.career_blueprint_snapshots
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own blueprints
CREATE POLICY "Users can create own career blueprints"
ON public.career_blueprint_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can manage blueprints
CREATE POLICY "System can manage career blueprints"
ON public.career_blueprint_snapshots
FOR ALL
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_career_blueprint_user ON public.career_blueprint_snapshots(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_career_blueprint_updated_at
BEFORE UPDATE ON public.career_blueprint_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();