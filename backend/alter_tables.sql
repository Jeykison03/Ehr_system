-- --- DB MIGRATION FOR MINI EHR PROTOCOL ---
-- Run this script inside your Supabase SQL Editor.
-- This script replaces 'full_name' with individual 'first_name' & 'last_name'
-- and adds 'age' and 'phone_number' parameters to both profiles.

-- 1. ALTER DOCTORS TABLE
ALTER TABLE doctors DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. ALTER PATIENTS TABLE
ALTER TABLE patients DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. ALTER SYMPTOMS TABLE — add new extended check-in fields
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS blood_sugar REAL;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS meal_info TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS medication_taken TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS image_url TEXT;
