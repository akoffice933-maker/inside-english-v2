-- Supabase Database Migrations for Inside English v2.0 (AI COACH, INSIDE BRIDGE & SHADOWING ATTEMPTS)
-- Run this in the Supabase SQL Editor to initialize all necessary tables and security policies.

-- ==========================================
-- 1. AI COACH SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_coach_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    state emotional_state NOT NULL,
    user_mood_input TEXT NOT NULL,
    intro_text TEXT NOT NULL,
    affirmation_text TEXT NOT NULL,
    affirmation_tokens JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;

-- Select/Insert policies
CREATE POLICY "Users can manage their own coaching sessions"
ON public.ai_coach_sessions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_coach_sessions_user ON public.ai_coach_sessions(user_id);


-- ==========================================
-- 2. INSIDE BRIDGE SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bridge_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL, 
    status TEXT NOT NULL DEFAULT 'active',
    state emotional_state NOT NULL DEFAULT 'relax',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.bridge_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bridge sessions"
ON public.bridge_sessions FOR ALL 
TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = partner_id)
WITH CHECK (auth.uid() = creator_id OR auth.uid() = partner_id);

CREATE INDEX IF NOT EXISTS idx_bridge_sessions_users ON public.bridge_sessions(creator_id, partner_id);


-- ==========================================
-- 3. INSIDE BRIDGE MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bridge_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.bridge_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL, 
    original_text TEXT NOT NULL,
    language_code TEXT NOT NULL,
    literal_translation TEXT NOT NULL,
    intent TEXT NOT NULL,
    emotion TEXT NOT NULL,
    suggested_replies JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.bridge_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their sessions"
ON public.bridge_messages FOR SELECT 
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.bridge_sessions s 
    WHERE s.id = session_id AND (s.creator_id = auth.uid() OR s.partner_id = auth.uid())
));

CREATE POLICY "Users can insert messages into their sessions"
ON public.bridge_messages FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.bridge_sessions s 
    WHERE s.id = session_id AND (s.creator_id = auth.uid() OR s.partner_id = auth.uid())
));

CREATE INDEX IF NOT EXISTS idx_bridge_messages_session ON public.bridge_messages(session_id);


-- ==========================================
-- 4. SHADOWING ATTEMPTS TABLE (Fixes Blocker #3: Real-world shadowing tracking!)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.shadowing_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
    score INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shadowing_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shadowing attempts"
ON public.shadowing_attempts FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_user ON public.shadowing_attempts(user_id);
