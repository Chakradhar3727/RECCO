-- 009_payments_escrow.sql
CREATE TYPE escrow_status AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

CREATE TABLE payment_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE, -- Razorpay Order ID
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status escrow_status DEFAULT 'HELD',
  pibo_id UUID REFERENCES pibo_entities(id),
  recycler_id UUID REFERENCES recycler_facilities(id),
  aggregator_id UUID REFERENCES aggregator_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID REFERENCES payment_escrows(id),
  invoice_url TEXT,
  total_amount DECIMAL(12, 2),
  platform_fee DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
