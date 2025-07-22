-- Fix missing is_active column in profiles table
-- Run this script in Supabase SQL Editor if you encounter "is_active column not found" errors

-- Add is_active column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles to have is_active = true
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_active';

-- Check current profiles
SELECT id, email, full_name, role, is_active 
FROM public.profiles; 