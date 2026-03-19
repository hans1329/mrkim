-- Add user_id to tax_accountants so accountants can log in
ALTER TABLE public.tax_accountants
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- RLS: Accountants can view their own record
CREATE POLICY "Accountants can view own record"
ON public.tax_accountants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Accountants can update their own record
CREATE POLICY "Accountants can update own record"
ON public.tax_accountants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow accountants to view assignments for their clients
CREATE POLICY "Accountants can view their assignments"
ON public.tax_accountant_assignments
FOR SELECT
TO authenticated
USING (
  accountant_id IN (
    SELECT id FROM public.tax_accountants WHERE user_id = auth.uid()
  )
);

-- Allow accountants to view consultations assigned to them
CREATE POLICY "Accountants can view their consultations"
ON public.tax_consultations
FOR SELECT
TO authenticated
USING (
  accountant_id IN (
    SELECT id FROM public.tax_accountants WHERE user_id = auth.uid()
  )
);

-- Allow accountants to update consultations (respond)
CREATE POLICY "Accountants can respond to consultations"
ON public.tax_consultations
FOR UPDATE
TO authenticated
USING (
  accountant_id IN (
    SELECT id FROM public.tax_accountants WHERE user_id = auth.uid()
  )
);

-- Allow accountants to view filing tasks assigned to them
CREATE POLICY "Accountants can view their filing tasks"
ON public.tax_filing_tasks
FOR SELECT
TO authenticated
USING (
  accountant_id IN (
    SELECT id FROM public.tax_accountants WHERE user_id = auth.uid()
  )
);

-- Allow accountants to update filing tasks
CREATE POLICY "Accountants can update their filing tasks"
ON public.tax_filing_tasks
FOR UPDATE
TO authenticated
USING (
  accountant_id IN (
    SELECT id FROM public.tax_accountants WHERE user_id = auth.uid()
  )
);

-- Allow accountants to view their clients' profiles (read-only)
CREATE POLICY "Accountants can view client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ta.user_id FROM public.tax_accountant_assignments ta
    WHERE ta.accountant_id IN (
      SELECT id FROM public.tax_accountants WHERE tax_accountants.user_id = auth.uid()
    )
    AND ta.status = 'confirmed'
  )
);

-- Allow accountants to view client transactions (read-only)
CREATE POLICY "Accountants can view client transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ta.user_id FROM public.tax_accountant_assignments ta
    WHERE ta.accountant_id IN (
      SELECT id FROM public.tax_accountants WHERE tax_accountants.user_id = auth.uid()
    )
    AND ta.status = 'confirmed'
  )
);

-- Allow accountants to view client tax invoices (read-only)
CREATE POLICY "Accountants can view client tax invoices"
ON public.tax_invoices
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ta.user_id FROM public.tax_accountant_assignments ta
    WHERE ta.accountant_id IN (
      SELECT id FROM public.tax_accountants WHERE tax_accountants.user_id = auth.uid()
    )
    AND ta.status = 'confirmed'
  )
);

-- Allow accountants to view client employees (read-only)
CREATE POLICY "Accountants can view client employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ta.user_id FROM public.tax_accountant_assignments ta
    WHERE ta.accountant_id IN (
      SELECT id FROM public.tax_accountants WHERE tax_accountants.user_id = auth.uid()
    )
    AND ta.status = 'confirmed'
  )
);

-- Allow accountants to view client delivery orders (read-only)
CREATE POLICY "Accountants can view client delivery orders"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ta.user_id FROM public.tax_accountant_assignments ta
    WHERE ta.accountant_id IN (
      SELECT id FROM public.tax_accountants WHERE tax_accountants.user_id = auth.uid()
    )
    AND ta.status = 'confirmed'
  )
);