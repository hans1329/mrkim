-- Allow new accountants to insert their own record during signup
CREATE POLICY "New accountants can register"
ON public.tax_accountants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);