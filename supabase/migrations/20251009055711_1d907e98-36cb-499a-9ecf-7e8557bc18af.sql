-- Create role_designs table
CREATE TABLE public.role_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  problem_statement TEXT NOT NULL,
  suggested_titles TEXT[],
  skills_matrix JSONB,
  jd_draft TEXT,
  interview_kit TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create role_design_versions table
CREATE TABLE public.role_design_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_design_id UUID NOT NULL REFERENCES public.role_designs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  jd_draft TEXT,
  interview_kit TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_design_id, version)
);

-- Enable RLS
ALTER TABLE public.role_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_design_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_designs
CREATE POLICY "Org members can view their org role designs"
  ON public.role_designs
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can create role designs"
  ON public.role_designs
  FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update their org role designs"
  ON public.role_designs
  FOR UPDATE
  USING (is_org_member(auth.uid(), org_id));

-- RLS Policies for role_design_versions
CREATE POLICY "Org members can view versions"
  ON public.role_design_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.role_designs
      WHERE role_designs.id = role_design_versions.role_design_id
        AND is_org_member(auth.uid(), role_designs.org_id)
    )
  );

CREATE POLICY "System can manage versions"
  ON public.role_design_versions
  FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_role_designs_org_id ON public.role_designs(org_id);
CREATE INDEX idx_role_designs_user_id ON public.role_designs(user_id);
CREATE INDEX idx_role_design_versions_role_design_id ON public.role_design_versions(role_design_id);