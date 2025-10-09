-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_profiles table
CREATE TABLE public.team_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  vector JSONB NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT,
  trait_vector JSONB,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team_fit_scores table
CREATE TABLE public.team_fit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  fit INTEGER NOT NULL CHECK (fit >= 0 AND fit <= 100),
  gaps TEXT[],
  fills TEXT[],
  frictions TEXT[],
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_fit_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Org members can view their org teams"
  ON public.teams
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can create teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update teams"
  ON public.teams
  FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id));

-- RLS Policies for team_profiles
CREATE POLICY "Org members can view team profiles"
  ON public.team_profiles
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage team profiles"
  ON public.team_profiles
  FOR ALL
  USING (true);

-- RLS Policies for team_members
CREATE POLICY "Org members can view team members"
  ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
        AND is_org_member(auth.uid(), teams.org_id)
    )
  );

CREATE POLICY "Org admins can manage team members"
  ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
        AND is_org_admin(auth.uid(), teams.org_id)
    )
  );

-- RLS Policies for team_fit_scores
CREATE POLICY "Org members can view team fit scores"
  ON public.team_fit_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_fit_scores.team_id
        AND is_org_member(auth.uid(), teams.org_id)
    )
  );

CREATE POLICY "System can manage team fit scores"
  ON public.team_fit_scores
  FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_teams_org_id ON public.teams(org_id);
CREATE INDEX idx_team_profiles_team_id ON public.team_profiles(team_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_fit_scores_team_id ON public.team_fit_scores(team_id);
CREATE INDEX idx_team_fit_scores_candidate_id ON public.team_fit_scores(candidate_id);