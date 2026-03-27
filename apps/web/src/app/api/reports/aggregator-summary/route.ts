import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/reports/aggregator-summary
 * Generates a CSV report of the aggregator's collections and batches.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get aggregator profile
    const { data: profile } = await supabase
      .from('aggregator_profiles')
      .select('id, aggregator_id_code, full_name, total_collections, total_weight_kg')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Aggregator profile not found' }, { status: 404 });

    // Fetch all collections
    const { data: collections } = await supabase
      .from('collections')
      .select('id, material_type, median_weight, status, created_at, gps_locality')
      .eq('aggregator_id', profile.id)
      .order('created_at', { ascending: false });

    // Fetch all batches
    const { data: batches } = await supabase
      .from('batches')
      .select('id, batch_number, status, total_weight, collection_count, created_at')
      .eq('aggregator_id', profile.id)
      .order('created_at', { ascending: false });

    // Build CSV
    const now = new Date().toISOString().split('T')[0];
    const lines: string[] = [];

    // Header section
    lines.push('RECCO Aggregator Summary Report');
    lines.push(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    lines.push(`Aggregator: ${profile.full_name || 'N/A'}`);
    lines.push(`Aggregator ID: ${profile.aggregator_id_code || 'N/A'}`);
    lines.push(`Total Collections: ${profile.total_collections || 0}`);
    lines.push(`Total Weight (kg): ${profile.total_weight_kg || 0}`);
    lines.push('');

    // Collections section
    lines.push('--- COLLECTIONS ---');
    lines.push('ID,Material Type,Weight (kg),Status,Location,Date');
    if (collections && collections.length > 0) {
      for (const c of collections) {
        const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '';
        lines.push(
          `${c.id},${c.material_type || 'MIXED'},${c.median_weight || 0},${c.status || ''},${(c.gps_locality || '').replace(/,/g, ';')},${date}`
        );
      }
    } else {
      lines.push('No collections found');
    }

    lines.push('');

    // Batches section
    lines.push('--- BATCHES ---');
    lines.push('Batch Number,Status,Total Weight (kg),Collection Count,Date');
    if (batches && batches.length > 0) {
      for (const b of batches) {
        const date = b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '';
        lines.push(
          `${b.batch_number || b.id},${b.status || ''},${b.total_weight || 0},${b.collection_count || 0},${date}`
        );
      }
    } else {
      lines.push('No batches found');
    }

    const csv = lines.join('\n');
    const filename = `RECCO_Report_${profile.aggregator_id_code || 'AGG'}_${now}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
