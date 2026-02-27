-- 012_rpc_functions.sql
-- Function to purchase certificate with row-level locking
CREATE OR REPLACE FUNCTION purchase_certificate_weight(
  p_cert_id UUID,
  p_buyer_id UUID,
  p_price DECIMAL
) RETURNS UUID AS $$
DECLARE
  v_escrow_id UUID;
  v_seller_id UUID;
BEGIN
  -- Lock the certificate row for update
  SELECT owner_id INTO v_seller_id
  FROM epr_certificates
  WHERE id = p_cert_id
  FOR UPDATE;

  -- Create escrow record
  INSERT INTO payment_escrows (amount, pibo_id, recycler_id, status)
  VALUES (p_price, p_buyer_id, v_seller_id, 'HELD')
  RETURNING id INTO v_escrow_id;

  -- Return escrow ID to trigger frontend payment flow
  RETURN v_escrow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
