import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * RECCO — Inventory Continuity Guards (Module 3.8)
 *
 * Enforces submission limits to prevent inventory manipulation:
 * - Daily capacity guard (max kg per day)
 * - Concurrent pending batch limit
 * - Minimum submission interval (5 min between collections)
 * - Velocity anomaly detection (>3 submissions/hour)
 */

// ── Configuration Constants ──────────────────────────────────────────
const MAX_DAILY_CAPACITY_KG = 5000; // Max weight an aggregator can submit per day
const MAX_CONCURRENT_PENDING_BATCHES = 5; // Max open batches at once
const MIN_SUBMISSION_INTERVAL_MINUTES = 5; // Min time between consecutive submissions
const VELOCITY_THRESHOLD_PER_HOUR = 3; // Flag if more than this many submissions/hour

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  velocityAnomaly?: boolean;
}

/**
 * Run all inventory continuity guards before allowing a new collection submission.
 */
export async function checkInventoryGuards(
  aggregatorId: string,
  newWeightKg: number
): Promise<GuardResult> {
  const supabase = createClient();

  // Get current date boundaries (UTC)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Run checks in parallel
  const [dailyResult, pendingBatchResult, lastSubmissionResult, hourlyResult] = await Promise.all([
    // 1. Today's total submitted weight
    supabase
      .from('collections')
      .select('median_weight')
      .eq('aggregator_id', aggregatorId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString()),

    // 2. Pending batch count
    supabase
      .from('batches')
      .select('id')
      .eq('aggregator_id', aggregatorId)
      .in('status', ['OPEN', 'PENDING', 'IN_TRANSIT']),

    // 3. Last submission timestamp
    supabase
      .from('collections')
      .select('created_at')
      .eq('aggregator_id', aggregatorId)
      .order('created_at', { ascending: false })
      .limit(1),

    // 4. Submissions in the last hour
    supabase
      .from('collections')
      .select('id')
      .eq('aggregator_id', aggregatorId)
      .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString()),
  ]);

  // ── G58: Daily Capacity Guard ──────────────────────────────────────
  const todaySubmittedKg = (dailyResult.data ?? []).reduce(
    (sum, c) => sum + (Number(c.median_weight) || 0),
    0
  );
  if (todaySubmittedKg + newWeightKg > MAX_DAILY_CAPACITY_KG) {
    return {
      allowed: false,
      reason: `Daily capacity exceeded. Today: ${todaySubmittedKg.toFixed(1)} kg + ${newWeightKg.toFixed(1)} kg > ${MAX_DAILY_CAPACITY_KG} kg limit.`,
    };
  }

  // ── G59: Concurrent Pending Batch Limit ────────────────────────────
  const pendingBatchCount = (pendingBatchResult.data ?? []).length;
  if (pendingBatchCount >= MAX_CONCURRENT_PENDING_BATCHES) {
    return {
      allowed: false,
      reason: `Too many pending batches (${pendingBatchCount}/${MAX_CONCURRENT_PENDING_BATCHES}). Complete existing batches before submitting new collections.`,
    };
  }

  // ── G62: Minimum Submission Interval ───────────────────────────────
  const lastSubmission = lastSubmissionResult.data?.[0];
  if (lastSubmission) {
    const lastTime = new Date(lastSubmission.created_at).getTime();
    const minutesSince = (now.getTime() - lastTime) / 60_000;
    if (minutesSince < MIN_SUBMISSION_INTERVAL_MINUTES) {
      const remaining = Math.ceil(MIN_SUBMISSION_INTERVAL_MINUTES - minutesSince);
      return {
        allowed: false,
        reason: `Too fast! Please wait ${remaining} more minute(s) between submissions.`,
      };
    }
  }

  // ── G60: Velocity Anomaly Detection (soft flag) ────────────────────
  const hourlyCount = (hourlyResult.data ?? []).length;
  const velocityAnomaly = hourlyCount >= VELOCITY_THRESHOLD_PER_HOUR;

  return {
    allowed: true,
    velocityAnomaly,
  };
}

/**
 * Insert a velocity anomaly fraud flag.
 */
export async function insertVelocityAnomalyFlag(
  userId: string,
  collectionId: string,
  submissionsInLastHour: number
): Promise<void> {
  const supabase = createClient();
  await supabase.from('fraud_flags').insert({
    entity_id: userId,
    flag_type: 'VELOCITY_ANOMALY',
    severity: 'MEDIUM',
    evidence_data: {
      collection_id: collectionId,
      submissions_last_hour: submissionsInLastHour,
      threshold: VELOCITY_THRESHOLD_PER_HOUR,
      flagged_at: new Date().toISOString(),
    },
  });
}
