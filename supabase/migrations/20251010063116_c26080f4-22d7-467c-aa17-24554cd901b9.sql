-- Drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Users can create orgs" ON orgs;

-- Create a properly structured INSERT policy for authenticated users
CREATE POLICY "Users can create orgs"
ON orgs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);