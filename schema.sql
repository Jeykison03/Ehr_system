-- ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (Custom Auth)
-- We removed REFERENCES auth.users to avoid Supabase Auth rate limits
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('patient', 'doctor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- SYMPTOMS TABLE
CREATE TABLE IF NOT EXISTS symptoms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    occurrence_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    medicine_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    alerts_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- NOTE: Since we are not using Supabase Auth (tokens), RLS policies using auth.uid() will not work.
-- For this custom implementation, we disable RLS to allow direct table access.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
