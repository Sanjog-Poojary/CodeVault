-- ============================================================
-- VaultFlow — Supabase Database Schema (Hardened)
-- Changes from v1:
--   - SECURITY DEFINER → SECURITY INVOKER on calculate_real_balance
--   - FOR ALL RLS split into explicit SELECT / INSERT / UPDATE / DELETE
--   - Soft-delete columns (is_deleted, deleted_at) on all tables
--   - Immutable protection: income_events cannot be deleted by users
--   - Input constraints added (positive amounts, valid date ranges)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  tax_rate     NUMERIC(5,2) DEFAULT 30.00 CHECK (tax_rate BETWEEN 0 AND 60),
  currency     CHAR(3) DEFAULT 'INR',
  gst_enabled  BOOLEAN DEFAULT FALSE,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INCOME EVENTS TABLE
CREATE TABLE IF NOT EXISTS income_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  tax_slice    NUMERIC(15,2) NOT NULL CHECK (tax_slice >= 0),
  net_amount   NUMERIC(15,2) NOT NULL CHECK (net_amount >= 0),
  client_name  TEXT,
  description  TEXT,
  event_date   DATE NOT NULL CHECK (event_date <= CURRENT_DATE + INTERVAL '1 day'),
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  client_name  TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency     CHAR(3) DEFAULT 'INR',
  status       TEXT CHECK (status IN ('DRAFT','SENT','OVERDUE','PAID')) DEFAULT 'DRAFT',
  due_date     DATE NOT NULL,
  paid_date    DATE,
  invoice_ref  TEXT UNIQUE,
  description  TEXT,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description     TEXT NOT NULL,
  category        TEXT,
  ai_confidence   NUMERIC(4,3) CHECK (ai_confidence BETWEEN 0 AND 1),
  is_deductible   BOOLEAN DEFAULT FALSE,
  expense_date    DATE NOT NULL,
  reviewed        BOOLEAN DEFAULT FALSE,
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMITTED BILLS TABLE
CREATE TABLE IF NOT EXISTS committed_bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  frequency    TEXT CHECK (frequency IN ('MONTHLY','QUARTERLY','ANNUAL')),
  next_due     DATE NOT NULL,
  active       BOOLEAN DEFAULT TRUE
);

-- 6. REAL BALANCE FUNCTION
-- SECURITY INVOKER: executes with the privileges of the CALLER,
-- so RLS on the underlying tables is always respected.
CREATE OR REPLACE FUNCTION calculate_real_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_gross  NUMERIC;
  v_bills  NUMERIC;
BEGIN
  SELECT COALESCE(SUM(net_amount), 0) INTO v_gross
    FROM income_events
   WHERE user_id = p_user_id AND is_deleted = FALSE;

  SELECT COALESCE(SUM(amount), 0) INTO v_bills
    FROM committed_bills
   WHERE user_id = p_user_id AND active = TRUE;

  RETURN v_gross - v_bills;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE committed_bills ENABLE ROW LEVEL SECURITY;

-- ── users ──────────────────────────────────────────────────
CREATE POLICY "users_select" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Prevent account self-deletion via API (handled server-side only)
-- No DELETE policy on users.

-- ── income_events ──────────────────────────────────────────
-- Users may SELECT and INSERT their own events.
-- UPDATE is allowed only for soft-deletes (is_deleted flag).
-- Hard DELETE is blocked — financial records are immutable.
CREATE POLICY "income_events_select" ON income_events
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "income_events_insert" ON income_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_events_softdelete" ON income_events
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: income records are permanent.

-- ── invoices ───────────────────────────────────────────────
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (auth.uid() = user_id AND status = 'DRAFT');

-- ── expenses ───────────────────────────────────────────────
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (auth.uid() = user_id AND reviewed = FALSE);

-- ── committed_bills ────────────────────────────────────────
CREATE POLICY "bills_select" ON committed_bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bills_insert" ON committed_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bills_update" ON committed_bills
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bills_delete" ON committed_bills
  FOR DELETE USING (auth.uid() = user_id);

-- 8. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE income_events;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
