import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

// Fraud flag type weights — higher weight = more severe impact on score
const FLAG_WEIGHTS: Record<string, number> = {
    WEIGHT_VARIANCE: 15,
    GPS_MISMATCH: 20,
    TRANSIT_TIME: 10,
    PROCESSING_SPEED: 12,
    WEIGHT_LOSS: 14,
    DUPLICATE_CERT: 25,
    PRO_DOUBLE_ALLOC: 22,
    OCR_MISMATCH: 8,
};

// Severity multipliers
const SEVERITY_MULTIPLIER: Record<string, number> = {
    CRITICAL: 1.5,
    HIGH: 1.2,
    MEDIUM: 1.0,
    LOW: 0.6,
};

Deno.serve(async (req: Request) => {
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse the webhook payload (INSERT on fraud_flags)
        const payload = await req.json();
        const record = payload.record || payload;
        const entityId = record.entity_id;

        if (!entityId) {
            return new Response(
                JSON.stringify({ error: "No entity_id in payload" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Fetch ALL unresolved fraud flags for this entity
        const { data: flags, error: flagsError } = await supabase
            .from("fraud_flags")
            .select("flag_type, severity, is_resolved")
            .eq("entity_id", entityId)
            .eq("is_resolved", false);

        if (flagsError) {
            console.error("Error fetching fraud flags:", flagsError);
            return new Response(
                JSON.stringify({ error: flagsError.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Calculate weighted fraud score
        // Score = sum of (flag_weight × severity_multiplier) for all unresolved flags
        // Capped at 100
        let rawScore = 0;
        for (const flag of flags || []) {
            const weight = FLAG_WEIGHTS[flag.flag_type] || 10;
            const multiplier = SEVERITY_MULTIPLIER[flag.severity] || 1.0;
            rawScore += weight * multiplier;
        }
        const finalScore = Math.min(Math.round(rawScore), 100);

        // Update the user profile with the new fraud score
        const { error: updateError } = await supabase
            .from("user_profiles")
            .update({ fraud_score: finalScore })
            .eq("id", entityId);

        if (updateError) {
            console.error("Error updating fraud score:", updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if score exceeds the auto-suspend threshold
        const { data: config } = await supabase
            .from("system_config")
            .select("value")
            .eq("key", "fraud_score_threshold")
            .single();

        const threshold = config ? parseInt(config.value, 10) : 80;

        // If score exceeds threshold, create a CRITICAL notification
        if (finalScore >= threshold) {
            await supabase.from("notifications").insert({
                user_id: entityId,
                title: "Fraud Score Threshold Exceeded",
                body: `Entity fraud score is ${finalScore} (threshold: ${threshold}). Auto-suspension may be triggered.`,
                notification_type: "CRITICAL",
                message: `ALERT: Entity ${entityId} has a fraud score of ${finalScore}, exceeding the auto-suspend threshold of ${threshold}. Immediate review required.`,
                target_portal: "ADMIN",
            });
        }

        console.log(
            `Fraud score calculated for entity ${entityId}: ${finalScore} (${(flags || []).length} unresolved flags)`
        );

        return new Response(
            JSON.stringify({
                entity_id: entityId,
                fraud_score: finalScore,
                unresolved_flags: (flags || []).length,
                threshold_exceeded: finalScore >= threshold,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Unhandled error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
