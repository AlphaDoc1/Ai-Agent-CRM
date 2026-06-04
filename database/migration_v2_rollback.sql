-- ============================================
-- Migration V2 Rollback
-- Run this if migration_v2.sql fails at any step before retrying
-- ============================================

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.call_turns;
DROP TABLE IF EXISTS public.call_analysis;
DROP SEQUENCE IF EXISTS support_ticket_seq;
DROP FUNCTION IF EXISTS public.nextval_support_ticket_seq();
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS source;

SELECT 'migration_v2 rollback applied successfully' AS result;
