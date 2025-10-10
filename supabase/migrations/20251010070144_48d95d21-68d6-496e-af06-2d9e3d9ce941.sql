-- Add RLS policies to users table to allow org members to view user data
CREATE POLICY "Org members can view user data"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM org_members om1
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid()
    AND om2.user_id = users.id
  )
);