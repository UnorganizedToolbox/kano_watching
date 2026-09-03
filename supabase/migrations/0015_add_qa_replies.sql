ALTER TABLE public.questions 
ADD COLUMN replies JSONB DEFAULT '[]'::jsonb;
