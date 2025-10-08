-- Production enhancements: observability, audit, enhanced fields

-- 1. Add new fields to existing tables
ALTER TABLE companies ADD COLUMN values_text TEXT;
ALTER TABLE companies ADD COLUMN country TEXT;
ALTER TABLE companies ADD COLUMN size_band TEXT;

ALTER TABLE jobs ADD COLUMN remote_mode TEXT CHECK (remote_mode IN ('onsite', 'remote', 'hybrid')) DEFAULT 'onsite';
ALTER TABLE jobs ADD COLUMN salary_range TEXT;
ALTER TABLE jobs ADD COLUMN tags TEXT[];

ALTER TABLE applications ADD COLUMN stage TEXT CHECK (stage IN ('new', 'shortlisted', 'interview', 'offer', 'hired', 'rejected')) DEFAULT 'new';
ALTER TABLE applications ADD COLUMN explanations JSONB;
ALTER TABLE applications ADD COLUMN ai_version TEXT;

ALTER TABLE resumes ADD COLUMN file_hash TEXT;

ALTER TABLE video_analysis ADD COLUMN rationale TEXT;

-- 2. Create observability tables
CREATE TABLE IF NOT EXISTS ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('parse', 'shortlist', 'video', 'culture')),
  input_hash TEXT,
  input_ref TEXT,
  output_json JSONB,
  latency_ms INTEGER,
  model_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')) DEFAULT 'ok',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_job_overall ON applications(job_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_apps_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON resumes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_kind_time ON ai_runs(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at DESC);

-- 4. RLS for new tables
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can read ai_runs and audit_log
CREATE POLICY "Admin can view ai_runs"
ON ai_runs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert ai_runs"
ON ai_runs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admin can view audit_log"
ON audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit_log"
ON audit_log FOR INSERT
WITH CHECK (true);

-- 5. Function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_meta_json JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, meta_json)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_meta_json)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;