-- ============================================
-- Demo E-commerce Database Schema & Sample Data
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop tables if they already exist
DROP TABLE IF EXISTS public.call_logs;
DROP TABLE IF EXISTS public.support_tickets;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.customers;

-- 1. CUSTOMERS TABLE
CREATE TABLE public.customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  account_created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 2. PRODUCTS TABLE
CREATE TABLE public.products (
  product_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Electronics', 'Clothing', 'Home')),
  price NUMERIC(10, 2) NOT NULL,
  stock_status TEXT NOT NULL CHECK (stock_status IN ('In Stock', 'Out of Stock'))
);

-- 3. ORDERS TABLE
CREATE TABLE public.orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(product_id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('Delivered', 'Pending', 'Cancelled')),
  issue_flag TEXT NOT NULL CHECK (issue_flag IN ('wrong_item', 'damaged', 'not_received', 'none'))
);

-- 4. SUPPORT_TICKETS TABLE
CREATE TABLE public.support_tickets (
  ticket_id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(order_id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Resolved'))
);

-- ============================================
-- INSERT SEED DATA
-- ============================================

-- Insert Customers (5 records)
INSERT INTO public.customers (customer_id, name, phone, email, account_created_date) VALUES
  ('CID001', 'Rajesh Sharma', '+91-9876543210', 'rajesh.sharma@example.com', '2025-01-15'),
  ('CID002', 'Priya Patel', '+91-9812345678', 'priya.patel@example.com', '2025-02-10'),
  ('CID003', 'Amit Verma', '+91-9765432109', 'amit.verma@example.com', '2025-03-05'),
  ('CID004', 'Ananya Sen', '+91-9988776655', 'ananya.sen@example.com', '2025-03-20'),
  ('CID005', 'Vikram Singh', '+91-9543210987', 'vikram.singh@example.com', '2025-04-01');

-- Insert Products (8 records)
INSERT INTO public.products (product_id, name, category, price, stock_status) VALUES
  ('PRD001', 'Redmi Note 13 Pro', 'Electronics', 24999.00, 'In Stock'),
  ('PRD002', 'boAt Rockerz 450', 'Electronics', 1499.00, 'In Stock'),
  ('PRD003', 'OnePlus Nord CE 4', 'Electronics', 26999.00, 'Out of Stock'),
  ('PRD004', 'Levi''s Men''s Slim Fit Jeans', 'Clothing', 3299.00, 'In Stock'),
  ('PRD005', 'FabIndia Cotton Kurta', 'Clothing', 1899.00, 'In Stock'),
  ('PRD006', 'Bombay Dyeing Bedsheet', 'Home', 1299.00, 'In Stock'),
  ('PRD007', 'Philips LED Desk Lamp', 'Home', 999.00, 'In Stock'),
  ('PRD008', 'Prestige Electric Kettle', 'Home', 1599.00, 'Out of Stock');

-- Insert Orders (10 records)
INSERT INTO public.orders (order_id, customer_id, product_id, order_date, delivery_status, issue_flag) VALUES
  ('ORD1001', 'CID001', 'PRD001', '2026-05-01', 'Delivered', 'none'),
  ('ORD1002', 'CID001', 'PRD004', '2026-05-15', 'Delivered', 'damaged'),
  ('ORD1003', 'CID002', 'PRD002', '2026-05-18', 'Delivered', 'none'),
  ('ORD1004', 'CID002', 'PRD007', '2026-05-20', 'Pending', 'none'),
  ('ORD1005', 'CID003', 'PRD003', '2026-05-22', 'Cancelled', 'none'),
  ('ORD1006', 'CID003', 'PRD005', '2026-05-25', 'Delivered', 'wrong_item'),
  ('ORD1007', 'CID004', 'PRD006', '2026-05-28', 'Delivered', 'none'),
  ('ORD1008', 'CID004', 'PRD008', '2026-05-30', 'Pending', 'none'),
  ('ORD1009', 'CID005', 'PRD001', '2026-06-01', 'Pending', 'none'),
  ('ORD1010', 'CID005', 'PRD005', '2026-06-02', 'Delivered', 'none');

-- Insert Support Tickets (5 records)
INSERT INTO public.support_tickets (ticket_id, order_id, customer_id, issue_type, description, status) VALUES
  ('TKT2001', 'ORD1002', 'CID001', 'damaged_product', 'The Levi jeans delivered are torn at the pocket.', 'Open'),
  ('TKT2002', 'ORD1006', 'CID003', 'wrong_item', 'Received a blue kurta instead of the green kurta ordered.', 'Open'),
  ('TKT2003', 'ORD1005', 'CID003', 'refund_request', 'Order was cancelled but refund not yet credited.', 'Resolved'),
  ('TKT2004', 'ORD1003', 'CID002', 'delivery_query', 'Received boAt Rockerz 450 but packaging was open.', 'Resolved'),
  ('TKT2005', 'ORD1009', 'CID005', 'late_delivery', 'The phone delivery has been delayed beyond the estimated date.', 'Open');

-- 5. CALL_LOGS TABLE
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_name TEXT,
  caller_phone TEXT,
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Allow Service Role access to all tables
CREATE POLICY "Service role full access customers" ON public.customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access support_tickets" ON public.support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access call_logs" ON public.call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow Authenticated read access
CREATE POLICY "Authenticated read access customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access support_tickets" ON public.support_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access call_logs" ON public.call_logs FOR SELECT TO authenticated USING (true);
