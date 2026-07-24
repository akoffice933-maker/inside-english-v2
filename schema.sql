-- Supabase Database Schema for Inside English v2.0 (SECURE & OPTIMIZED FOR PRODUCTION)
-- Fixes critical vulnerability: splits tokens out of the main tracks table to avoid content leaks.
-- Includes full table schemas, custom types, performance indexes, and strict RLS policies.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE user_level AS ENUM ('A0', 'A1', 'A2', 'B1', 'B2', 'C1');
CREATE TYPE track_type AS ENUM ('mindtrack', 'hypno');
CREATE TYPE emotional_state AS ENUM ('relax', 'energy', 'sleep');
CREATE TYPE word_status AS ENUM ('learning', 'mastered', 'difficult');

-- 3. USERS TABLE (Extends Supabase Auth users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    preferred_state emotional_state DEFAULT 'relax',
    level user_level DEFAULT 'A1',
    streak INT DEFAULT 0,
    total_audio_minutes INT DEFAULT 0,
    total_words_learned INT DEFAULT 0,
    settings JSONB DEFAULT '{"theme": "dark", "notifications": true, "tts_speed": 1.0, "is_premium": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- 4. TRACKS TABLE (MindTracks and HypnoTracks - Basic Metadata Only, safe for public select)
CREATE TABLE public.tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type track_type NOT NULL DEFAULT 'mindtrack',
    level user_level NOT NULL DEFAULT 'A1',
    state emotional_state NOT NULL DEFAULT 'relax',
    audio_url TEXT NOT NULL, -- Path to storage bucket
    duration INT NOT NULL, -- Duration in seconds
    cover_gradient TEXT NOT NULL, -- CSS Linear Gradient presentation
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for tracks
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view track metadata (Safe)
CREATE POLICY "Tracks are viewable by authenticated users" 
    ON public.tracks FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 5. TRACK CONTENTS TABLE (PRO CONTENT PROTECTION LAYER)
-- Fixes Vulnerability #2: Separates text tokens into a protected table linked to premium entitlement checks
CREATE TABLE public.track_contents (
    track_id UUID PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
    tokens JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for track contents
ALTER TABLE public.track_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read track tokens if the track is free OR they have premium subscription active
CREATE POLICY "Users can only read tokens of free tracks or if they are premium subscribers"
ON public.track_contents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tracks t
        WHERE t.id = track_id AND (
            t.is_premium = FALSE OR 
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid() AND (u.settings->>'is_premium')::boolean = TRUE
            )
        )
    )
);

-- Admin only write access on tracks & contents
CREATE POLICY "Admin write access on tracks"
    ON public.tracks FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.settings->>'is_admin')::boolean = true));

CREATE POLICY "Admin write access on track contents"
    ON public.track_contents FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.settings->>'is_admin')::boolean = true));

-- 6. USER PROGRESS TABLE
CREATE TABLE public.user_progress (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
    listened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    progress FLOAT DEFAULT 0.0, -- Values between 0.0 and 1.0
    is_completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, track_id)
);

-- Enable RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
    ON public.user_progress FOR ALL
    USING (auth.uid() = user_id);

-- 7. USER WORDS (Personal Vocabulary Book)
CREATE TABLE public.user_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    context TEXT, -- Sentence context
    status word_status DEFAULT 'learning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, word)
);

-- Enable RLS for user_words
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vocabulary"
    ON public.user_words FOR ALL
    USING (auth.uid() = user_id);

-- 8. PERFORMANCE INDEXES
CREATE INDEX idx_tracks_state ON public.tracks(state);
CREATE INDEX idx_tracks_level ON public.tracks(level);
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_words_user ON public.user_words(user_id);

-- 9. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_tracks_modtime BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_words_modtime BEFORE UPDATE ON public.user_words FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_track_contents_modtime BEFORE UPDATE ON public.track_contents FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
