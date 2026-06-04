-- ============================================
-- AI CRM + Distributor System — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'distributor', 'agent')),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- ============================================
-- 2. DISTRIBUTORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  region TEXT,
  city TEXT,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  total_leads_assigned INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distributors_state ON public.distributors(state);
CREATE INDEX idx_distributors_email ON public.distributors(email);
CREATE INDEX idx_distributors_user_id ON public.distributors(user_id);

-- ============================================
-- 3. INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  state TEXT,
  city TEXT,
  message TEXT,
  product_interest TEXT,
  inquiry_type TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ai_processed', 'assigned', 'in_progress', 'converted', 'closed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ai_summary TEXT,
  ai_raw_response JSONB,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'voice', 'api', 'manual')),
  assigned_distributor_id UUID REFERENCES public.distributors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_status ON public.inquiries(status);
CREATE INDEX idx_inquiries_priority ON public.inquiries(priority);
CREATE INDEX idx_inquiries_state ON public.inquiries(state);
CREATE INDEX idx_inquiries_distributor ON public.inquiries(assigned_distributor_id);
CREATE INDEX idx_inquiries_created ON public.inquiries(created_at DESC);

-- ============================================
-- 4. LEAD ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  assigned_by TEXT DEFAULT 'ai_auto',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'converted', 'rejected')),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_inquiry ON public.lead_assignments(inquiry_id);
CREATE INDEX idx_assignments_distributor ON public.lead_assignments(distributor_id);
CREATE INDEX idx_assignments_status ON public.lead_assignments(status);

-- ============================================
-- 5. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('inquiry', 'distributor', 'assignment', 'user', 'system')),
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

-- ============================================
-- 6. CALL LOGS TABLE (Voice AI)
-- ============================================
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,
  caller_name TEXT,
  caller_phone TEXT,
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed', 'escalated')),
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_inquiry ON public.call_logs(inquiry_id);
CREATE INDEX idx_calls_status ON public.call_logs(status);
CREATE INDEX idx_calls_created ON public.call_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (admin-level)
-- In production, restrict by role
CREATE POLICY "Authenticated users can read all" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users full access distributors" ON public.distributors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access inquiries" ON public.inquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access assignments" ON public.lead_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access activity" ON public.activity_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access calls" ON public.call_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access users" ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributors_updated_at
  BEFORE UPDATE ON public.distributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.lead_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Sample Distributors
-- ============================================
INSERT INTO public.distributors (name, state, region, city, phone, email) VALUES
  ('Rajesh Distributors', 'Maharashtra', 'West', 'Mumbai', '+91-9876543210', 'rajesh@example.com'),
  ('Kumar Enterprises', 'Karnataka', 'South', 'Bangalore', '+91-9876543211', 'kumar@example.com'),
  ('Delhi Distribution Co', 'Delhi', 'North', 'New Delhi', '+91-9876543212', 'delhi@example.com'),
  ('Gujarat Traders', 'Gujarat', 'West', 'Ahmedabad', '+91-9876543213', 'gujarat@example.com'),
  ('Tamil Nadu Supplies', 'Tamil Nadu', 'South', 'Chennai', '+91-9876543214', 'tn@example.com'),
  ('UP Distribution Hub', 'Uttar Pradesh', 'North', 'Lucknow', '+91-9876543215', 'up@example.com'),
  ('Bengal Distributors', 'West Bengal', 'East', 'Kolkata', '+91-9876543216', 'bengal@example.com'),
  ('Rajasthan Traders', 'Rajasthan', 'West', 'Jaipur', '+91-9876543217', 'rajasthan@example.com')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 7. CUSTOMER CODES TABLE (Unique 6-Digit Codes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_codes_code ON public.customer_codes(code);

ALTER TABLE public.customer_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access customer_codes" ON public.customer_codes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access customer_codes" ON public.customer_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

