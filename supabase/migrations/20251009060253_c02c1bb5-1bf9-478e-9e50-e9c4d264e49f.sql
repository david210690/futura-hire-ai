-- Create hire status enum
CREATE TYPE public.hire_status AS ENUM ('active', 'exited');

-- Create retention horizon enum
CREATE TYPE public.retention_horizon AS ENUM ('30d', '60d', '90d');

-- Create hires table
CREATE TABLE public.hires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  manager_id UUID NOT NULL,
  status hire_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create retention_scores table
CREATE TABLE public.retention_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hire_id UUID NOT NULL REFERENCES public.hires(id) ON DELETE CASCADE,
  horizon retention_horizon NOT NULL,
  risk INTEGER NOT NULL CHECK (risk >= 0 AND risk <= 100),
  rationale TEXT,
  tips TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hire_id, horizon)
);

-- Create pulse_checks table
CREATE TABLE public.pulse_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hire_id UUID NOT NULL REFERENCES public.hires(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  self_report JSONB,
  manager_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hires
CREATE POLICY "Org members can view their org hires"
  ON public.hires
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can create hires"
  ON public.hires
  FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update hires"
  ON public.hires
  FOR UPDATE
  USING (is_org_member(auth.uid(), org_id));

-- RLS Policies for retention_scores
CREATE POLICY "Org members can view retention scores"
  ON public.retention_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hires
      WHERE hires.id = retention_scores.hire_id
        AND is_org_member(auth.uid(), hires.org_id)
    )
  );

CREATE POLICY "System can manage retention scores"
  ON public.retention_scores
  FOR ALL
  USING (true);

-- RLS Policies for pulse_checks
CREATE POLICY "Org members can view pulse checks"
  ON public.pulse_checks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hires
      WHERE hires.id = pulse_checks.hire_id
        AND is_org_member(auth.uid(), hires.org_id)
    )
  );

CREATE POLICY "Org members can create pulse checks"
  ON public.pulse_checks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hires
      WHERE hires.id = pulse_checks.hire_id
        AND is_org_member(auth.uid(), hires.org_id)
    )
  );

CREATE POLICY "System can manage pulse checks"
  ON public.pulse_checks
  FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_hires_org_id ON public.hires(org_id);
CREATE INDEX idx_hires_application_id ON public.hires(application_id);
CREATE INDEX idx_hires_manager_id ON public.hires(manager_id);
CREATE INDEX idx_hires_status ON public.hires(status);
CREATE INDEX idx_retention_scores_hire_id ON public.retention_scores(hire_id);
CREATE INDEX idx_pulse_checks_hire_id ON public.pulse_checks(hire_id);
CREATE INDEX idx_pulse_checks_day ON public.pulse_checks(day);