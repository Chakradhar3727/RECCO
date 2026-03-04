-- 016_fix_registration_tables.sql
-- Fix registration tables to match application code
-- ============================================================

-- 1. Aggregators table (code uses 'aggregators' not 'aggregator_profiles')
CREATE TABLE IF NOT EXISTS aggregators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE aggregators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access aggregators" ON aggregators;
CREATE POLICY "Service role full access aggregators" ON aggregators FOR ALL USING (true) WITH CHECK (true);

-- 2. Aggregator PIN attempts table
CREATE TABLE IF NOT EXISTS aggregator_pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts INT DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ
);
ALTER TABLE aggregator_pin_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access pin_attempts" ON aggregator_pin_attempts;
CREATE POLICY "Service role full access pin_attempts" ON aggregator_pin_attempts FOR ALL USING (true) WITH CHECK (true);

-- 3. user_profiles table (ensure it exists)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  display_name TEXT,
  admin_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access profiles" ON user_profiles;
CREATE POLICY "Service role full access profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. Fix pibo_entities - add missing columns if table exists, create if not
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pibo_entities' AND table_schema = 'public') THEN
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS pibo_user_id TEXT;
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS registration_step INT DEFAULT 1;
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'DRAFT';
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
    ALTER TABLE pibo_entities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    -- Make company_name nullable for step-by-step registration
    ALTER TABLE pibo_entities ALTER COLUMN company_name DROP NOT NULL;
  ELSE
    CREATE TABLE pibo_entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      company_name TEXT,
      pibo_type TEXT,
      pibo_user_id TEXT,
      gst_number TEXT,
      registration_step INT DEFAULT 1,
      approval_status TEXT DEFAULT 'DRAFT',
      submitted_at TIMESTAMPTZ,
      annual_obligation_mt DECIMAL(12, 2) DEFAULT 0,
      current_compliance_mt DECIMAL(12, 2) DEFAULT 0,
      compliance_gap_mt DECIMAL(12, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE pibo_entities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Service role full access pibo" ON pibo_entities;
    CREATE POLICY "Service role full access pibo" ON pibo_entities FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add unique constraint on user_id if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pibo_entities_user_id_key'
  ) THEN
    ALTER TABLE pibo_entities ADD CONSTRAINT pibo_entities_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 5. Fix recycler_facilities - add missing columns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recycler_facilities' AND table_schema = 'public') THEN
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS cpcb_registration_number TEXT;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS spcb_consent_number TEXT;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS epr_registration_number TEXT;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS cpcb_format_warning BOOLEAN DEFAULT FALSE;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS registration_step INT DEFAULT 1;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 7);
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(10, 7);
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS processing_capacity_kg DECIMAL(12, 2);
    ALTER TABLE recycler_facilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    -- Make facility_name nullable
    ALTER TABLE recycler_facilities ALTER COLUMN facility_name DROP NOT NULL;
  ELSE
    CREATE TABLE recycler_facilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      facility_name TEXT,
      address TEXT,
      gps_latitude DECIMAL(10, 7),
      gps_longitude DECIMAL(10, 7),
      processing_capacity_kg DECIMAL(12, 2),
      cpcb_registration_number TEXT,
      spcb_consent_number TEXT,
      epr_registration_number TEXT,
      cpcb_format_warning BOOLEAN DEFAULT FALSE,
      registration_step INT DEFAULT 1,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE recycler_facilities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Service role full access recycler" ON recycler_facilities;
    CREATE POLICY "Service role full access recycler" ON recycler_facilities FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add unique constraint on user_id if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recycler_facilities_user_id_key'
  ) THEN
    ALTER TABLE recycler_facilities ADD CONSTRAINT recycler_facilities_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 6. Fix pro_organisations - add missing columns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_organisations' AND table_schema = 'public') THEN
    ALTER TABLE pro_organisations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE pro_organisations ADD COLUMN IF NOT EXISTS registration_step INT DEFAULT 1;
    ALTER TABLE pro_organisations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE pro_organisations ALTER COLUMN org_name DROP NOT NULL;
  ELSE
    CREATE TABLE pro_organisations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      org_name TEXT,
      cpcb_reg_number TEXT,
      registration_step INT DEFAULT 1,
      total_pool_mt DECIMAL(12, 2) DEFAULT 0,
      unallocated_mt DECIMAL(12, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE pro_organisations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Service role full access pro" ON pro_organisations;
    CREATE POLICY "Service role full access pro" ON pro_organisations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add unique constraint on user_id if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pro_organisations_user_id_key'
  ) THEN
    ALTER TABLE pro_organisations ADD CONSTRAINT pro_organisations_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
