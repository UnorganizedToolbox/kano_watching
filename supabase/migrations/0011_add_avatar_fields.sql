ALTER TABLE public.profiles
  ADD COLUMN avatar_seed text DEFAULT 'LearnFlowUser123',
  ADD COLUMN saved_avatars text[] DEFAULT ARRAY['LearnFlowUser123'];
