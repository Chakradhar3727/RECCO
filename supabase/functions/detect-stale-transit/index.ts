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
    // 1. Get stale hours config
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "transit_stale_hours")
      .single();

    const staleHours = config?.value ? parseInt(config.value, 10) : 72;
    const cutoffDate = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();

    // 2. Query IN_TRANSIT batches older than cutoff
    const { data: staleBatches, error: queryError } = await supabase
      .from("batches")
      .select("id, picked_up_at, recycler_id, aggregator_id")
      .eq("status", "IN_TRANSIT")
      .not("picked_up_at", "is", null)
      .lt("picked_up_at", cutoffDate);

    if (queryError) {
      throw queryError;
    }

    if (!staleBatches || staleBatches.length === 0) {
      return new Response(JSON.stringify({ message: "No stale batches found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Filter out batches that already have a TRANSIT_TIME fraud flag
    const batchIds = staleBatches.map(b => b.id);
    const { data: existingFlags } = await supabase
      .from("fraud_flags")
      .select("batch_id")
      .eq("flag_type", "TRANSIT_TIME")
      .in("batch_id", batchIds);

    const flaggedIds = new Set(existingFlags?.map(f => f.batch_id) || []);
    const newStaleBatches = staleBatches.filter(b => !flaggedIds.has(b.id));

    let processedCount = 0;

    // 4. Insert Fraud Flags and Notifications
    for (const batch of newStaleBatches) {
      const pickedUpAt = new Date(batch.picked_up_at);
      const hoursElapsed = Math.floor((Date.now() - pickedUpAt.getTime()) / (1000 * 60 * 60));

      const { error: insertFlagError } = await supabase
        .from("fraud_flags")
        .insert({
          entity_id: batch.id,
          batch_id: batch.id,
          flag_type: "TRANSIT_TIME",
          severity: "HIGH",
          evidence_data: {
            picked_up_at: batch.picked_up_at,
            hours_elapsed: hoursElapsed,
            recycler_id: batch.recycler_id,
            aggregator_id: batch.aggregator_id
          },
          detail_json: {
            picked_up_at: batch.picked_up_at,
            hours_elapsed: hoursElapsed,
            recycler_id: batch.recycler_id,
            aggregator_id: batch.aggregator_id
          }
        });

      if (!insertFlagError) {
        await supabase
          .from("notifications")
          .insert({
            notification_type: "HIGH",
            trigger_code: "ADMIN_STALE_TRANSIT",
            target_portal: "ADMIN",
            message: `Batch ${batch.id.substring(0, 8).toUpperCase()} has been in transit for ${hoursElapsed} hours without delivery confirmation.`,
            title: "Stale Transit Alert"
          });
          processedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      message: "Stale batches processed", 
      found: staleBatches.length,
      processed: processedCount 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("detect-stale-transit error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
