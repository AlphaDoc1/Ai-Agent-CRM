ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_sid TEXT UNIQUE;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en-IN';
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_status_check;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_status_check 
  CHECK (status IN ('initiated', 'in_progress', 'completed', 'failed', 'escalated'));