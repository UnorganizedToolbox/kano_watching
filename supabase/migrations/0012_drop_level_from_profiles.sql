-- Convert exp to total_exp and drop level
DO $$
DECLARE
    r RECORD;
    total_exp integer;
    lvl integer;
BEGIN
    FOR r IN SELECT id, level, exp FROM public.profiles LOOP
        total_exp := COALESCE(r.exp, 0);
        FOR lvl IN 1..(COALESCE(r.level, 1) - 1) LOOP
            total_exp := total_exp + (lvl * lvl * 100);
        END LOOP;
        UPDATE public.profiles SET exp = total_exp WHERE id = r.id;
    END LOOP;
END $$;

ALTER TABLE public.profiles DROP COLUMN level;
