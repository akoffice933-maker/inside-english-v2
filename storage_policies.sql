-- Supabase Storage Configuration & RLS Policies for Inside English v2.0
-- This script registers the buckets and secures them with Row-Level Security (RLS).
-- Run this in the Supabase SQL Editor.

-- ==========================================
-- 1. BUCKET REGISTRATION
-- ==========================================

-- Register 'audio-tracks' bucket (Private: only accessed via authenticated or signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-tracks', 
    'audio-tracks', 
    false, -- Private bucket
    52428800, -- 50 MB limit per track
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Register 'shadowing-records' bucket (Private: user recordings for speech evaluation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shadowing-records', 
    'shadowing-records', 
    false, -- Private bucket
    10485760, -- 10 MB limit (recordings are typically short)
    ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/wav', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Register 'avatars' bucket (Public: user profile photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true, -- Public bucket
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ==========================================
-- 2. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row-Level Security on the objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

----------------------------------------------
-- BUCKET: audio-tracks (Private)
----------------------------------------------

-- Policy 1: Authenticated users can read audio tracks (Free level).
-- For Premium tracks, we will use Signed URLs generated via an Edge Function/API, 
-- but we also secure basic Read access here.
CREATE POLICY "Authenticated users can read free audio tracks"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'audio-tracks' AND 
    (
        -- Ensure premium tracks are filtered. If track is premium, only admins or users with active premium can read
        -- Note: For full premium safety, generating 15-minute temporary Signed URLs on-the-fly via Edge Function is the standard.
        -- This RLS policy acts as a secondary layer of security.
        NOT (name LIKE 'premium/%') OR 
        (
            -- Checks if user setting 'is_premium' is true in the custom public.users table
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE public.users.id = auth.uid() AND (public.users.settings->>'is_premium')::boolean = true
            )
        )
    )
);

-- Policy 2: Admin only write access (create/update/delete) on audio-tracks
CREATE POLICY "Admins have full access on audio-tracks"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'audio-tracks' AND
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE public.users.id = auth.uid() AND (public.users.settings->>'is_admin')::boolean = true
    )
)
WITH CHECK (
    bucket_id = 'audio-tracks' AND
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE public.users.id = auth.uid() AND (public.users.settings->>'is_admin')::boolean = true
    )
);

----------------------------------------------
-- BUCKET: shadowing-records (Private)
----------------------------------------------

-- Policy 1: Users can upload recordings into their own folder (folder name must match auth.uid())
CREATE POLICY "Users can upload shadowing records to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'shadowing-records' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read only their own shadowing records
CREATE POLICY "Users can read their own shadowing records"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'shadowing-records' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete only their own shadowing records
CREATE POLICY "Users can delete their own shadowing records"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'shadowing-records' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

----------------------------------------------
-- BUCKET: avatars (Public)
----------------------------------------------

-- Policy 1: Anyone can read user avatars (Public)
CREATE POLICY "Anyone can view user avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 2: Users can upload/update their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
