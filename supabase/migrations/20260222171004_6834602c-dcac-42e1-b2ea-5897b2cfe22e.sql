-- Add linked_deposit_id to auto_transfers
ALTER TABLE public.auto_transfers
ADD COLUMN linked_deposit_id uuid REFERENCES public.deposits(id) ON DELETE SET NULL;

-- Create function to update deposit amount when auto_transfer is executed
CREATE OR REPLACE FUNCTION public.update_linked_deposit_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes to 'completed' and there's a linked deposit
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.linked_deposit_id IS NOT NULL THEN
    UPDATE public.deposits
    SET amount = amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.linked_deposit_id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auto_transfer_completed
  BEFORE UPDATE ON public.auto_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_linked_deposit_on_transfer();
