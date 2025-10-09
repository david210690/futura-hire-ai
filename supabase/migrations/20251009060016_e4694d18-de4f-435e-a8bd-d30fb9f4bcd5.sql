-- Create culture event source enum
CREATE TYPE public.culture_event_source AS ENUM ('hire', 'reject', 'interview');

-- Create culture_profiles table
CREATE TABLE public.culture_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  vector JSONB NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create culture_events table
CREATE TABLE public.culture_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  source culture_event_source NOT NULL,
  payload JSONB NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create culture_matches table
CREATE TABLE public.culture_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.culture_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culture_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for culture_profiles
CREATE POLICY "Org members can view their org culture profile"
  ON public.culture_profiles
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage culture profiles"
  ON public.culture_profiles
  FOR ALL
  USING (true);

-- RLS Policies for culture_events
CREATE POLICY "Org members can view their org culture events"
  ON public.culture_events
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "System can manage culture events"
  ON public.culture_events
  FOR ALL
  USING (true);

-- RLS Policies for culture_matches
CREATE POLICY "Org members can view culture matches"
  ON public.culture_matches
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Candidates can view their own culture matches"
  ON public.culture_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = culture_matches.candidate_id
        AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage culture matches"
  ON public.culture_matches
  FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_culture_profiles_org_id ON public.culture_profiles(org_id);
CREATE INDEX idx_culture_events_org_id ON public.culture_events(org_id);
CREATE INDEX idx_culture_events_created_at ON public.culture_events(created_at DESC);
CREATE INDEX idx_culture_matches_org_id ON public.culture_matches(org_id);
CREATE INDEX idx_culture_matches_candidate_id ON public.culture_matches(candidate_id);