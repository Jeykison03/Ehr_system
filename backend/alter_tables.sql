-- Mini EHR DB Migration Script
-- Run this inside the Supabase SQL editor to enable new patient profiles and symptom check-in attributes.

-- ADD NEW SYMPTOMS COLUMNS IF NOT ALREADY PRESENT
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS blood_sugar REAL;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS meal_info TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS medication_taken TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ADD NEW PATIENTS COLUMNS FOR PROFILE MANAGEMENT
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- CREATE SPEEDUP INDEXES FOR PATIENTS AND SYMPTOMS
CREATE INDEX IF NOT EXISTS symptoms_patient_id_idx ON symptoms(patient_id);

