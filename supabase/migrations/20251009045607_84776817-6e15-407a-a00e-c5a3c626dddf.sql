-- Create entitlements table
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, feature)
);

-- Create usage_counters table
CREATE TABLE public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  metric TEXT NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, metric, day)
);

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for entitlements
CREATE POLICY "Org members can view entitlements"
ON public.entitlements FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage entitlements"
ON public.entitlements FOR ALL
USING (public.is_org_admin(auth.uid(), org_id));

-- RLS policies for usage_counters
CREATE POLICY "Org members can view usage"
ON public.usage_counters FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage usage"
ON public.usage_counters FOR ALL
USING (true);

-- Helper function: get entitlement value
CREATE OR REPLACE FUNCTION public.get_entitlement(_org_id UUID, _feature TEXT)
RETURNS TABLE(enabled BOOLEAN, value TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT enabled, value
  FROM public.entitlements
  WHERE org_id = _org_id AND feature = _feature
  LIMIT 1;
$$;

-- Helper function: get usage for a metric on a day
CREATE OR REPLACE FUNCTION public.get_usage(_org_id UUID, _metric TEXT, _day DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(count, 0)
  FROM public.usage_counters
  WHERE org_id = _org_id AND metric = _metric AND day = _day
  LIMIT 1;
$$;

-- Helper function: increment usage and return remaining quota
CREATE OR REPLACE FUNCTION public.increment_usage(_org_id UUID, _metric TEXT)
RETURNS TABLE(count INTEGER, limit_value INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER;
  v_limit_feature TEXT;
BEGIN
  -- Determine limit feature name from metric
  v_limit_feature := 'limits_' || _metric || '_per_day';
  
  -- Get limit from entitlements (default values if not set)
  SELECT COALESCE(
    (SELECT value::INTEGER FROM public.entitlements 
     WHERE org_id = _org_id AND feature = v_limit_feature),
    CASE _metric
      WHEN 'ai_shortlist' THEN 3
      WHEN 'video_analysis' THEN 2
      WHEN 'coach_runs' THEN 2
      WHEN 'bias_runs' THEN 2
      WHEN 'marketing_runs' THEN 3
      ELSE 5
    END
  ) INTO v_limit;
  
  -- Upsert usage counter
  INSERT INTO public.usage_counters (org_id, metric, day, count, updated_at)
  VALUES (_org_id, _metric, CURRENT_DATE, 1, now())
  ON CONFLICT (org_id, metric, day)
  DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
  RETURNING usage_counters.count INTO v_count;
  
  -- Return count, limit, and remaining
  RETURN QUERY SELECT v_count, v_limit, GREATEST(0, v_limit - v_count);
END;
$$;

-- Seed default entitlements for all existing orgs (Free tier)
INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT 
  o.id,
  f.feature,
  f.enabled,
  f.value
FROM public.orgs o
CROSS JOIN (VALUES
  ('feature_basic_shortlist', true, NULL),
  ('feature_video_summary', false, NULL),
  ('feature_career_coach', false, NULL),
  ('feature_bias_analyzer', false, NULL),
  ('feature_marketing_assets', false, NULL),
  ('limits_ai_shortlist_per_day', true, '3'),
  ('limits_video_analysis_per_day', true, '2'),
  ('limits_coach_runs_per_day', true, '2'),
  ('limits_bias_runs_per_day', true, '2'),
  ('limits_marketing_runs_per_day', true, '3')
) AS f(feature, enabled, value)
ON CONFLICT (org_id, feature) DO NOTHING;

-- Trigger to seed entitlements for new orgs
CREATE OR REPLACE FUNCTION public.seed_org_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    (NEW.id, 'limits_marketing_runs_per_day', true, '3')
  ON CONFLICT (org_id, feature) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_org_created_seed_entitlements
  AFTER INSERT ON public.orgs
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_org_entitlements();

-- Add indices for performance
CREATE INDEX idx_entitlements_org_feature ON public.entitlements(org_id, feature);
CREATE INDEX idx_usage_counters_org_metric_day ON public.usage_counters(org_id, metric, day);