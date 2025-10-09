-- Create org_role enum for organization-level roles
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

-- Create orgs table
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create org_members table
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.org_role NOT NULL DEFAULT 'recruiter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Create invites table
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'recruiter',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add org_id to companies (initially nullable for migration)
ALTER TABLE public.companies ADD COLUMN org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

-- Add org_id to jobs (initially nullable for migration)
ALTER TABLE public.jobs ADD COLUMN org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

-- Add org_id to applications (initially nullable for migration)
ALTER TABLE public.applications ADD COLUMN org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

-- Add org_id to interview_questions (initially nullable for migration)
ALTER TABLE public.interview_questions ADD COLUMN org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

-- Create a demo org and backfill existing data
DO $$
DECLARE
  demo_org_id UUID;
  first_user_id UUID;
BEGIN
  -- Get first user to be owner
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  -- Create demo org
  INSERT INTO public.orgs (name, owner_id)
  VALUES ('Demo Organization', COALESCE(first_user_id, gen_random_uuid()))
  RETURNING id INTO demo_org_id;
  
  -- Add all existing users as members of demo org
  INSERT INTO public.org_members (org_id, user_id, role)
  SELECT demo_org_id, u.id, 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'admin') THEN 'admin'::org_role
      ELSE 'recruiter'::org_role
    END
  FROM auth.users u
  ON CONFLICT (org_id, user_id) DO NOTHING;
  
  -- Backfill org_id on existing tables
  UPDATE public.companies SET org_id = demo_org_id WHERE org_id IS NULL;
  UPDATE public.jobs SET org_id = demo_org_id WHERE org_id IS NULL;
  UPDATE public.applications SET org_id = demo_org_id WHERE org_id IS NULL;
  UPDATE public.interview_questions SET org_id = demo_org_id WHERE org_id IS NULL;
END $$;

-- Now make org_id NOT NULL
ALTER TABLE public.companies ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.applications ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.interview_questions ALTER COLUMN org_id SET NOT NULL;

-- Create function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Create function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id 
      AND org_id = _org_id 
      AND role = _role
  )
$$;

-- Create function to check if user is org owner or admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id 
      AND org_id = _org_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- Enable RLS on new tables
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for orgs
CREATE POLICY "Users can view orgs they are members of"
ON public.orgs FOR SELECT
USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Users can create orgs"
ON public.orgs FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Org owners can update their org"
ON public.orgs FOR UPDATE
USING (public.has_org_role(auth.uid(), id, 'owner'));

-- RLS policies for org_members
CREATE POLICY "Users can view members of their orgs"
ON public.org_members FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can add members"
ON public.org_members FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update member roles"
ON public.org_members FOR UPDATE
USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can remove members"
ON public.org_members FOR DELETE
USING (public.is_org_admin(auth.uid(), org_id));

-- RLS policies for invites
CREATE POLICY "Users can view invites for their orgs"
ON public.invites FOR SELECT
USING (public.is_org_member(auth.uid(), org_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Org admins can create invites"
ON public.invites FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "System can update invites"
ON public.invites FOR UPDATE
USING (true);

CREATE POLICY "Org admins can delete invites"
ON public.invites FOR DELETE
USING (public.is_org_admin(auth.uid(), org_id));

-- Update RLS policies for companies
DROP POLICY IF EXISTS "Recruiters can create companies" ON public.companies;
DROP POLICY IF EXISTS "Recruiters can update own company" ON public.companies;
DROP POLICY IF EXISTS "Recruiters can view own company" ON public.companies;

CREATE POLICY "Org members can view their org companies"
ON public.companies FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org recruiters can create companies"
ON public.companies FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'recruiter') 
  AND public.is_org_member(auth.uid(), org_id)
);

CREATE POLICY "Org admins can update companies"
ON public.companies FOR UPDATE
USING (public.is_org_admin(auth.uid(), org_id));

-- Update RLS policies for jobs
DROP POLICY IF EXISTS "Recruiters can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;

CREATE POLICY "Anyone can view open jobs or org members can view all jobs"
ON public.jobs FOR SELECT
USING (
  status = 'open' 
  OR public.is_org_member(auth.uid(), org_id)
);

CREATE POLICY "Org recruiters can create jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'recruiter')
  AND public.is_org_member(auth.uid(), org_id)
  AND EXISTS (SELECT 1 FROM public.companies WHERE id = jobs.company_id AND org_id = jobs.org_id)
);

CREATE POLICY "Org members can update jobs"
ON public.jobs FOR UPDATE
USING (public.is_org_member(auth.uid(), org_id));

-- Update RLS policies for applications - avoid recursion
DROP POLICY IF EXISTS "Candidates can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can view applications for own jobs" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update applications" ON public.applications;
DROP POLICY IF EXISTS "System can create applications" ON public.applications;

CREATE POLICY "Org members view apps for org jobs"
ON public.applications FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update apps"
ON public.applications FOR UPDATE
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System creates applications"
ON public.applications FOR INSERT
WITH CHECK (true);

-- Update RLS policies for interview_questions
DROP POLICY IF EXISTS "Recruiters can view questions for own jobs" ON public.interview_questions;
DROP POLICY IF EXISTS "Recruiters can update own job questions" ON public.interview_questions;
DROP POLICY IF EXISTS "System can create questions" ON public.interview_questions;

CREATE POLICY "Org members can view interview questions"
ON public.interview_questions FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update interview questions"
ON public.interview_questions FOR UPDATE
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "System can create interview questions"
ON public.interview_questions FOR INSERT
WITH CHECK (true);

-- Add indices for performance
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_email ON public.invites(email);
CREATE INDEX idx_companies_org_id ON public.companies(org_id);
CREATE INDEX idx_jobs_org_id ON public.jobs(org_id);
CREATE INDEX idx_applications_org_id ON public.applications(org_id);
CREATE INDEX idx_interview_questions_org_id ON public.interview_questions(org_id);