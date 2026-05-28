-- Mini EHR: doctor ↔ patient assignment + notifications
-- Run this in Supabase SQL editor (recommended).

-- PROFILES: doctor_code + assigned doctor
alter table if exists public.profiles
  add column if not exists doctor_code text;

alter table if exists public.profiles
  add column if not exists assigned_doctor_id uuid;

-- Optional constraints (enable if you want strictness)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_assigned_doctor_fk'
  ) then
    alter table public.profiles
      add constraint profiles_assigned_doctor_fk
      foreign key (assigned_doctor_id) references public.profiles(id) on delete set null;
  end if;
exception when undefined_table then
  -- ignore
end $$;

-- Optional unique doctor_code
do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'profiles_doctor_code_unique'
  ) then
    create unique index profiles_doctor_code_unique
      on public.profiles(doctor_code)
      where doctor_code is not null;
  end if;
exception when undefined_table then
  -- ignore
end $$;

-- PRESCRIPTIONS: next visit date (optional)
alter table if exists public.prescriptions
  add column if not exists next_visit_date date;

-- REPORTS: who uploaded (optional)
alter table if exists public.reports
  add column if not exists doctor_id uuid;

-- NOTIFICATIONS: simple patient alert feed
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  type text not null,
  title text,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_patient_created_at_idx
  on public.notifications(patient_id, created_at desc);

-- If you're using Supabase RLS, you likely want policies like:
-- - patients can select their own notifications
-- - doctors can insert notifications for assigned patients
-- Policies are project-specific, so not included here.

