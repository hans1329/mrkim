-- Allow authenticated users to update tax_accountants where user_id is null and email matches
-- This enables linking the account after email confirmation
CREATE POLICY "Accountants can link own record by email"
ON public.tax_accountants
FOR UPDATE
TO authenticated
USING (user_id IS NULL)
WITH CHECK (user_id = auth.uid());

-- Allow anonymous insert (for signup before email confirmation)
DROP POLICY IF EXISTS "New accountants can register" ON public.tax_accountants;
CREATE POLICY "Anyone can register as accountant"
ON public.tax_accountants
FOR INSERT
TO public
WITH CHECK (user_id IS NULL);