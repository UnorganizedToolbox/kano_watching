-- Add target date and title to profiles
ALTER TABLE public.profiles 
ADD COLUMN target_date DATE,
ADD COLUMN target_title TEXT;
