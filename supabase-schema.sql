-- ============================================================
-- VaultFlow — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  tax_rate     NUMERIC(5,2) DEFAULT 30.00,
  currency     CHAR(3) DEFAULT 'INR',
  gst_enabled  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INCOME EVENTS TABLE
CREATE TABLE IF NOT EXISTS income_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  tax_slice    NUMERIC(15,2) NOT NULL,
  net_amount   NUMERIC(15,2) NOT NULL,
  client_name  TEXT,
  description  TEXT,
  event_date   DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  client_name  TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL,
  currency     CHAR(3) DEFAULT 'INR',
  status       TEXT CHECK (status IN ('DRAFT','SENT','OVERDUE','PAID')) DEFAULT 'DRAFT',
  due_date     DATE NOT NULL,
  paid_date    DATE,
  invoice_ref  TEXT UNIQUE,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT,
  ai_confidence   NUMERIC(4,3),
  is_deductible   BOOLEAN DEFAULT FALSE,
  expense_date    DATE NOT NULL,
  reviewed        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMITTED BILLS TABLE
CREATE TABLE IF NOT EXISTS committed_bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL,
  frequency    TEXT CHECK (frequency IN ('MONTHLY','QUARTERLY','ANNUAL')),
  next_due     DATE NOT NULL,
  active       BOOLEAN DEFAULT TRUE
);

-- 6. REAL BALANCE FUNCTION
CREATE OR REPLACE FUNCTION calculate_real_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_gross       NUMERIC;
  v_bills       NUMERIC;
BEGIN
  SELECT COALESCE(SUM(net_amount), 0) INTO v_gross
  FROM income_events WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_bills
  FROM committed_bills WHERE user_id = p_user_id AND active = TRUE;

  RETURN v_gross - v_bills;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ROW LEVEL SECURITY — All tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE committed_bills ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "own_user_data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "own_income_events" ON income_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_invoices" ON invoices
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_bills" ON committed_bills
  FOR ALL USING (auth.uid() = user_id);

-- 8. REALTIME — Enable for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE income_events;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
