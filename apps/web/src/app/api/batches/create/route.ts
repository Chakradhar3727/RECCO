import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/batches/create
 * Groups selected collections into a new batch.
 * Updates collection statuses to IN_BATCH.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { collectionIds } = await request.json();
    if (!collectionIds || !Array.isArray(collectionIds) || collectionIds.length === 0) {
      return NextResponse.json({ error: 'No collections selected' }, { status: 400 });
    }

    // Get aggregator profile
    const { data: profile } = await supabase
      .from('aggregator_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Aggregator profile not found' }, { status: 404 });

    // Fetch the selected collections to compute total weight and material breakdown
    const { data: collections, error: fetchError } = await supabase
      .from('collections')
      .select('id, material_type, median_weight')
      .eq('aggregator_id', profile.id)
      .eq('status', 'AVAILABLE_FOR_BATCHING')
      .in('id', collectionIds);

    if (fetchError || !collections || collections.length === 0) {
      return NextResponse.json({ error: 'Collections not found or not available' }, { status: 400 });
    }

    // Compute material breakdown and total weight
    const materialBreakdown: Record<string, number> = {};
    let totalWeight = 0;
    for (const c of collections) {
      const mat = c.material_type ?? 'MIXED';
      const w = Number(c.median_weight) || 0;
      materialBreakdown[mat] = (materialBreakdown[mat] || 0) + w;
      totalWeight += w;
    }

    // Generate batch number
    const now = new Date();
    const batchNumber = `BATCH-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Insert batch
    const { data: batch, error: insertError } = await supabase
      .from('batches')
      .insert({
        aggregator_id: profile.id,
        batch_number: batchNumber,
        status: 'PENDING_PICKUP',
        total_weight: totalWeight,
        material_breakdown: materialBreakdown,
        collection_count: collections.length,
      })
      .select('id, batch_number')
      .single();

    if (insertError) {
      console.error('Batch insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
    }

    // Update all selected collections to IN_BATCH status
    const { error: updateError } = await supabase
      .from('collections')
      .update({
        status: 'IN_BATCH',
        batch_id: batch.id,
      })
      .in('id', collectionIds)
      .eq('aggregator_id', profile.id);

    if (updateError) {
      console.error('Collection update error:', updateError);
    }

    return NextResponse.json({ id: batch.id, batchNumber: batch.batch_number, status: 'success' });
  } catch (err) {
    console.error('Create batch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
