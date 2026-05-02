-- Add connection status fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hometax_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hometax_connected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS card_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS card_connected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS account_connected_at timestamp with time zone;