-- Fix search_path security warnings for the new functions
ALTER FUNCTION generate_slug(text) SET search_path = public;
ALTER FUNCTION set_org_slug() SET search_path = public;
ALTER FUNCTION set_job_slug() SET search_path = public;
ALTER FUNCTION generate_apply_token() SET search_path = public;
ALTER FUNCTION set_apply_token() SET search_path = public;