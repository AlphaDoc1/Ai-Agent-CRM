
-- ============================================
-- Create ALL Tables for Elanpro CRM
-- ============================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'distributor', 'agent')),
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Distributors Table
CREATE TABLE IF NOT EXISTS distributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT,
    state TEXT NOT NULL,
    city TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
    product_categories TEXT,
    is_active BOOLEAN DEFAULT true,
    total_leads_assigned INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    state TEXT,
    city TEXT,
    message TEXT,
    product_interest TEXT,
    inquiry_type TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ai_processed', 'assigned', 'in_progress', 'converted', 'closed', 'escalated')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    ai_summary TEXT,
    ai_raw_response JSONB,
    source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'voice', 'api', 'manual')),
    assigned_distributor_id UUID REFERENCES distributors(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Lead Assignments Table
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id),
    distributor_id UUID NOT NULL REFERENCES distributors(id),
    assigned_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'converted', 'rejected')),
    notes TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('inquiry', 'distributor', 'assignment', 'user', 'system')),
    entity_id UUID,
    action TEXT NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Call Logs Table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES inquiries(id),
    caller_name TEXT,
    caller_phone TEXT,
    duration_seconds INTEGER DEFAULT 0,
    transcript TEXT,
    ai_summary TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'escalated')),
    escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    business_type TEXT CHECK (business_type IN ('Hospitality', 'Healthcare', 'QSR', 'Retail', 'Pharma', 'Industrial', 'Other')),
    city TEXT,
    state TEXT,
    account_created_date TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id TEXT,
    order_date TIMESTAMPTZ DEFAULT NOW(),
    quantity INTEGER DEFAULT 1,
    delivery_status TEXT NOT NULL DEFAULT 'Processing' CHECK (delivery_status IN ('Delivered', 'In Transit', 'Processing', 'Cancelled')),
    installation_status TEXT CHECK (installation_status IN ('Pending', 'Scheduled', 'Completed', 'Not Required')),
    warranty_expiry TIMESTAMPTZ
);

-- 9. Service Tickets Table
CREATE TABLE IF NOT EXISTS service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id TEXT,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('AMC', 'Warranty_Claim', 'Installation', 'Spare_Parts', 'Repair', 'Complaint', 'General')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Escalated')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 10. Call Analysis Table
CREATE TABLE IF NOT EXISTS call_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL,
    issue_type TEXT,
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    sentiment_score NUMERIC DEFAULT 0.5,
    resolution_status TEXT,
    turn_count INTEGER DEFAULT 0,
    db_timeout BOOLEAN DEFAULT false,
    notification_flag BOOLEAN DEFAULT false,
    urgent_flag BOOLEAN DEFAULT false,
    call_group TEXT,
    summary_note TEXT,
    pipeline_error TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Call Turns Table
CREATE TABLE IF NOT EXISTS call_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL,
    turn_index INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('CUSTOMER', 'AGENT', 'SYSTEM')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    call_group TEXT,
    is_read BOOLEAN DEFAULT false,
    urgent_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Done! All tables created!
-- ============================================
