-- Add image_url to questions table
ALTER TABLE public.questions ADD COLUMN image_url text;

-- Create storage bucket for QA images
INSERT INTO storage.buckets (id, name, public) VALUES ('qa_images', 'qa_images', true);

-- Enable RLS on storage.objects
-- Note: storage.objects already has RLS enabled by default in Supabase, 
-- but we add policies specific to our bucket.

-- Allow authenticated users to upload files to qa_images bucket
CREATE POLICY "Authenticated users can upload QA images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qa_images');

-- Allow everyone to read files from qa_images bucket (since it's a public bucket, 
-- but explicit policies are good practice)
CREATE POLICY "Anyone can view QA images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'qa_images');

-- Allow users to delete their own uploaded images (optional but good practice)
CREATE POLICY "Users can delete own QA images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'qa_images' AND auth.uid() = owner);
