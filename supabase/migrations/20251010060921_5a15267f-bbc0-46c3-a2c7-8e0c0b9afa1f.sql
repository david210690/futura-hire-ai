-- Fix RLS policy on orgs table to allow proper joins from org_members
DROP POLICY IF EXISTS "Users can view orgs they are members of" ON orgs;

CREATE POLICY "Users can view orgs they are members of" ON orgs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = orgs.id
    AND org_members.user_id = auth.uid()
  )
);

-- Ensure org_members table has proper SELECT policy
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

CREATE POLICY "Users can view members of their orgs" ON org_members
FOR SELECT
USING (user_id = auth.uid() OR is_org_member(auth.uid(), org_id));