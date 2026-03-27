import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing Env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingBatches, error } = await supabase
      .from("batches")
      .select(`
        id, 
        status, 
        picked_up_at, 
        aggregator_id, 
        recycler_id, 
        pickup_hash, 
        delivery_hash
      `)
      .in("status", ["IN_TRANSIT", "ARRIVED"])
      .gt("picked_up_at", sevenDaysAgo)
      .or('pickup_hash.is.null,delivery_hash.is.null');

    if (error) {
      throw error;
    }

    if (!pendingBatches || pendingBatches.length === 0) {
      return new Response(JSON.stringify({ message: "No retryable batches found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let processedCount = 0;

    for (const batch of pendingBatches) {
      // Find missing events for this batch
      const { data: events } = await supabase
        .from("batch_transport_events")
        .select(`id, event_type, scan_lat, scan_lng, created_at, retry_count`)
        .eq("batch_id", batch.id);

      if (!events) continue;

      for (const event of events) {
        if (event.event_type === "PICKUP_CONFIRMED" && !batch.pickup_hash) {
          // Retry logic
          if (event.retry_count && event.retry_count >= 3) {
            await supabase.from("notifications").insert({
              notification_type: "HIGH",
              target_portal: "ADMIN",
              title: "Hash Retry Failed",
              message: `Batch ${batch.id.substring(0, 8).toUpperCase()} blockchain pickup hash permanently failed — manual review required.`,
              trigger_code: "ADMIN_HASH_FAIL"
            });
            continue;
          }

          // Trigger record-transport-hash
          await fetch(`${supabaseUrl}/functions/v1/record-transport-hash`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              event_type: event.event_type,
              batch_id: batch.id,
              batch_transport_event_id: event.id,
              scan_lat: event.scan_lat,
              scan_lng: event.scan_lng,
              timestamp_iso: event.created_at,
              aggregator_id: batch.aggregator_id,
              recycler_id: batch.recycler_id
            })
          });

          await supabase.from("batch_transport_events")
            .update({ retry_count: (event.retry_count || 0) + 1 })
            .eq("id", event.id);
            
          processedCount++;
        }

        if (event.event_type === "DELIVERY_CONFIRMED" && !batch.delivery_hash && batch.status === "ARRIVED") {
          if (event.retry_count && event.retry_count >= 3) {
             await supabase.from("notifications").insert({
              notification_type: "HIGH",
              target_portal: "ADMIN",
              title: "Hash Retry Failed",
              message: `Batch ${batch.id.substring(0, 8).toUpperCase()} blockchain delivery hash permanently failed — manual review required.`,
              trigger_code: "ADMIN_HASH_FAIL"
            });
            continue;
          }

          // Trigger record-transport-hash
          await fetch(`${supabaseUrl}/functions/v1/record-transport-hash`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              event_type: event.event_type,
              batch_id: batch.id,
              batch_transport_event_id: event.id,
              scan_lat: event.scan_lat,
              scan_lng: event.scan_lng,
              timestamp_iso: event.created_at,
              aggregator_id: batch.aggregator_id,
              recycler_id: batch.recycler_id
            })
          });

          await supabase.from("batch_transport_events")
            .update({ retry_count: (event.retry_count || 0) + 1 })
            .eq("id", event.id);
            
          processedCount++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: "Retry job completed", 
      processed: processedCount 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("retry-transport-hashes error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
