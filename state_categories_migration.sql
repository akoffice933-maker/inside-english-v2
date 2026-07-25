-- Additive migration: adds 'calm' and 'focus' labels to the emotional_state enum.
-- Run this in the Supabase SQL Editor.
--
-- Context: the original schema only had 3 states (relax / energy / sleep).
-- The new frontend (src/components/StateSelector.tsx) uses 4 categories:
-- calm / focus / energy / sleep. Rather than rename or remove the existing
-- 'relax' label (which would break already-seeded tracks and any code still
-- querying for it), we ADD the two new labels alongside it. Existing tracks
-- keep working; new/edited tracks can use 'calm' or 'focus' directly.
--
-- app/api/recommendations/route.ts maps legacy 'relax' rows onto both the
-- 'calm' and 'focus' frontend categories so old seed data still surfaces
-- (see STATE_MAP in that file) — no need to backfill existing rows, but you
-- can optionally reclassify old 'relax' tracks explicitly, e.g.:
--   UPDATE public.tracks SET state = 'calm' WHERE state = 'relax' AND ...;

ALTER TYPE emotional_state ADD VALUE IF NOT EXISTS 'calm';
ALTER TYPE emotional_state ADD VALUE IF NOT EXISTS 'focus';
