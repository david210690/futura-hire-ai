-- Fix companies table to work with orgs properly
-- Add missing pricing column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT 'free';

-- Ensure all orgs get default entitlements including role_designer
CREATE OR REPLACE FUNCTION public.seed_org_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.entitlements (org_id, feature, enabled, value)
  VALUES
    (NEW.id, 'feature_basic_shortlist', true, NULL),
    (NEW.id, 'feature_video_summary', true, NULL),
    (NEW.id, 'feature_career_coach', true, NULL),
    (NEW.id, 'feature_bias_analyzer', true, NULL),
    (NEW.id, 'feature_marketing_assets', true, NULL),
    (NEW.id, 'feature_role_designer', true, NULL),
    (NEW.id, 'limits_ai_shortlist_per_day', true, '10'),
    (NEW.id, 'limits_video_analysis_per_day', true, '10'),
    (NEW.id, 'limits_coach_runs_per_day', true, '10'),
    (NEW.id, 'limits_bias_runs_per_day', true, '10'),
    (NEW.id, 'limits_marketing_runs_per_day', true, '10'),
    (NEW.id, 'limits_copilot_per_day', true, '50')
  ON CONFLICT (org_id, feature) DO UPDATE SET enabled = EXCLUDED.enabled, value = EXCLUDED.value;
  
  RETURN NEW;
END;
$$;

-- Seed entitlements for existing orgs
INSERT INTO public.entitlements (org_id, feature, enabled, value)
SELECT 
  o.id,
  f.feature,
  f.enabled,
  f.value
FROM orgs o
CROSS JOIN (
  VALUES
    ('feature_basic_shortlist', true, NULL),
    ('feature_video_summary', true, NULL),
    ('feature_career_coach', true, NULL),
    ('feature_bias_analyzer', true, NULL),
    ('feature_marketing_assets', true, NULL),
    ('feature_role_designer', true, NULL),
    ('limits_ai_shortlist_per_day', true, '10'),
    ('limits_video_analysis_per_day', true, '10'),
    ('limits_coach_runs_per_day', true, '10'),
    ('limits_bias_runs_per_day', true, '10'),
    ('limits_marketing_runs_per_day', true, '10'),
    ('limits_copilot_per_day', true, '50')
) AS f(feature, enabled, value)
ON CONFLICT (org_id, feature) DO UPDATE SET enabled = EXCLUDED.enabled, value = EXCLUDED.value;