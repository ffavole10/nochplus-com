
-- Make submission-photos bucket public for direct URL access
UPDATE storage.buckets SET public = true WHERE id = 'submission-photos';
