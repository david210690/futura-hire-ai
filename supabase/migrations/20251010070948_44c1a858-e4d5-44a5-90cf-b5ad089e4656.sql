-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can view user data" ON users;

-- Create a security definer function to check if two users share an org
CREATE OR REPLACE FUNCTION public.shares_org_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members om1
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = _user_id
    AND om2.user_id = _other_user_id
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Users can view org members data"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid() OR shares_org_with(auth.uid(), id));