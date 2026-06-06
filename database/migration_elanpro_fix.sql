-- ============================================
-- FIXES FOR ELANPRO SCHEMA MIGRATION
-- Run this to fix relationship errors and missing tables
-- ============================================

-- 1. Add Foreign Key for Inquiries to Distributors
ALTER TABLE public.inquiries 
DROP CONSTRAINT IF EXISTS fk_inquiries_distributor;

ALTER TABLE public.inquiries 
ADD CONSTRAINT fk_inquiries_distributor 
FOREIGN KEY (assigned_distributor) 
REFERENCES public.distributors(distributor_id)
ON DELETE SET NULL;

-- 2. Add Missing Columns to Distributors
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS total_leads_assigned INTEGER DEFAULT 0;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS total_conversions INTEGER DEFAULT 0;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Create Missing Lead Assignments Table
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
  distributor_id TEXT REFERENCES public.distributors(distributor_id) ON DELETE CASCADE,
  assigned_by TEXT DEFAULT 'ai_auto',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'converted', 'rejected')),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Missing Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS and Policies for new tables
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON public.lead_assignments;
CREATE POLICY "Allow all for service role" ON public.lead_assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON public.activity_logs;
CREATE POLICY "Allow all for service role" ON public.activity_logs FOR ALL USING (true);
