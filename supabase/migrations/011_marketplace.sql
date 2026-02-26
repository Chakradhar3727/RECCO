-- 011_marketplace.sql
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id UUID REFERENCES epr_certificates(id) UNIQUE,
  price_per_mt DECIMAL(12, 2) NOT NULL,
  listing_valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id UUID REFERENCES epr_certificates(id),
  buyer_id UUID REFERENCES user_profiles(id),
  seller_id UUID REFERENCES user_profiles(id),
  escrow_id UUID REFERENCES payment_escrows(id),
  purchase_price DECIMAL(12, 2),
  blockchain_transfer_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
