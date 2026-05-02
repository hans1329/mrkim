
CREATE OR REPLACE FUNCTION public.get_tax_classification_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'unclassified', COUNT(*) FILTER (WHERE tax_classification_status IS NULL OR tax_classification_status = 'unclassified'),
    'ai_suggested', COUNT(*) FILTER (WHERE tax_classification_status = 'ai_suggested'),
    'confirmed', COUNT(*) FILTER (WHERE tax_classification_status = 'confirmed'),
    'manual', COUNT(*) FILTER (WHERE tax_classification_status = 'manual'),
    'totalExpense', COALESCE(SUM(amount), 0),
    'vatDeductibleAmount', COALESCE(SUM(amount) FILTER (WHERE vat_deductible = true), 0),
    'vatAmount', COALESCE(SUM(vat_amount) FILTER (WHERE vat_deductible = true), 0)
  )
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'expense';
$$;
