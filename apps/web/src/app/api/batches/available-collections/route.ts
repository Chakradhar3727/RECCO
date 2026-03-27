import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/batches/available-collections
 * Returns collections with status AVAILABLE_FOR_BATCHING for the current aggregator.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('aggregator_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ collections: [] });

    const { data: collections } = await supabase
      .from('collections')
      .select('id, material_type, median_weight, created_at')
      .eq('aggregator_id', profile.id)
      .eq('status', 'AVAILABLE_FOR_BATCHING')
      .order('created_at', { ascending: false });

    return NextResponse.json({ collections: collections ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
