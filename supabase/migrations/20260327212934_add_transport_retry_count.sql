ALTER TABLE batch_transport_events
ADD COLUMN retry_count INT DEFAULT 0;
