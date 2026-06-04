-- ============================================
-- Migration V2 — AI Voice Agent: New Tables & Columns
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add source column to call_logs to distinguish voice vs chat (FIX A)
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'voice';

-- 2. Sequence for auto-generated ticket IDs (starts at 3000 to avoid TKT2001-2005 conflicts)
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START WITH 3000;

-- 2b. RPC Helper to call nextval from clients
CREATE OR REPLACE FUNCTION public.nextval_support_ticket_seq()
RETURNS integer AS $$
BEGIN
  RETURN nextval('support_ticket_seq')::integer;
END;
$$ LANGUAGE plpgsql;

-- 3. Incremental call metadata (FIX 2)
CREATE TABLE IF NOT EXISTS public.call_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.call_logs(id) ON DELETE CASCADE,
  issue_type TEXT,
  customer_id TEXT,
  order_id TEXT,
  sentiment_score NUMERIC(3,2) DEFAULT 0.50,
  resolution_status TEXT DEFAULT 'ACTIVE' CHECK (resolution_status IN ('ACTIVE', 'ENDED', 'ESCALATED')),
  turn_count INTEGER DEFAULT 0,
  db_timeout BOOLEAN DEFAULT FALSE,
  notification_flag BOOLEAN DEFAULT FALSE,
  urgent_flag BOOLEAN DEFAULT FALSE,
  call_group TEXT CHECK (call_group IN ('ORDER', 'PAYMENT', 'PRODUCT', 'ACCOUNT', 'GENERAL')),
  summary_note TEXT,
  pipeline_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id)
);

-- 4. Individual conversation turns (FIX 8)
CREATE TABLE IF NOT EXISTS public.call_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.call_logs(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('CUSTOMER', 'AGENT', 'SYSTEM')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_turns_call_id ON public.call_turns(call_id);

-- 5. Dashboard notifications (FIX 5)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  call_group TEXT CHECK (call_group IN ('ORDER', 'PAYMENT', 'PRODUCT', 'ACCOUNT', 'GENERAL')),
  is_read BOOLEAN DEFAULT FALSE,
  urgent_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Done
SELECT 'migration_v2 applied successfully' AS result;
