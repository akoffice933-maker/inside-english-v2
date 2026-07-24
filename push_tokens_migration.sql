-- SQL Migration file to enable Push Notification Token storage in Supabase
-- Run this in the Supabase SQL Editor.

CREATE TABLE public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL, -- 'ios' | 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for push tokens table
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only write/delete their own tokens
CREATE POLICY "Users can manage their own push tokens"
ON public.user_push_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Performance Index
CREATE INDEX idx_push_tokens_user_id ON public.user_push_tokens(user_id);
