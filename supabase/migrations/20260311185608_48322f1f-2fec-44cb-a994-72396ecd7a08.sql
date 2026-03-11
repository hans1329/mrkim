
-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins can manage accountants" ON public.tax_accountants;
DROP POLICY IF EXISTS "Anyone authenticated can view active accountants" ON public.tax_accountants;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage accountants"
ON public.tax_accountants
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authenticated can view active accountants"
ON public.tax_accountants
FOR SELECT
TO authenticated
USING (is_active = true);
