-- Create copilot tables for AI assistant
CREATE TABLE public.copilot_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.copilot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.copilot_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  params JSONB,
  result_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copilot_threads
CREATE POLICY "Org members can create threads"
  ON public.copilot_threads
  FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can view their org threads"
  ON public.copilot_threads
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Users can update own threads"
  ON public.copilot_threads
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for copilot_messages
CREATE POLICY "Users can create messages in their threads"
  ON public.copilot_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.copilot_threads
      WHERE id = copilot_messages.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in accessible threads"
  ON public.copilot_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.copilot_threads t
      WHERE t.id = copilot_messages.thread_id
      AND is_org_member(auth.uid(), t.org_id)
    )
  );

-- RLS Policies for copilot_actions_log
CREATE POLICY "System can log copilot actions"
  ON public.copilot_actions_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view actions log"
  ON public.copilot_actions_log
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Add copilot rate limit to entitlements for existing orgs
INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT id, 'limits_copilot_per_day', true, '20'
FROM public.orgs
ON CONFLICT (org_id, feature) DO NOTHING;

-- Update seed_org_entitlements trigger to include copilot limit
CREATE OR REPLACE FUNCTION public.seed_org_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.entitlements (org_id, feature, enabled, value)
  VALUES
    (NEW.id, 'feature_basic_shortlist', true, NULL),
    (NEW.id, 'feature_video_summary', false, NULL),
    (NEW.id, 'feature_career_coach', false, NULL),
    (NEW.id, 'feature_bias_analyzer', false, NULL),
    (NEW.id, 'feature_marketing_assets', false, NULL),
    (NEW.id, 'limits_ai_shortlist_per_day', true, '3'),
    (NEW.id, 'limits_video_analysis_per_day', true, '2'),
    (NEW.id, 'limits_coach_runs_per_day', true, '2'),
    (NEW.id, 'limits_bias_runs_per_day', true, '2'),
    (NEW.id, 'limits_marketing_runs_per_day', true, '3'),
    (NEW.id, 'limits_copilot_per_day', true, '20')
  ON CONFLICT (org_id, feature) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_copilot_threads_org_id ON public.copilot_threads(org_id);
CREATE INDEX idx_copilot_threads_user_id ON public.copilot_threads(user_id);
CREATE INDEX idx_copilot_messages_thread_id ON public.copilot_messages(thread_id);
CREATE INDEX idx_copilot_actions_log_org_id ON public.copilot_actions_log(org_id);
CREATE INDEX idx_copilot_actions_log_created_at ON public.copilot_actions_log(created_at);