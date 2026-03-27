import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data: profiles, error: err1 } = await supabase.from('user_profiles').select('*');
  const { data: recyclers, error: err2 } = await supabase.from('recycler_facilities').select('*');
  const { data: aggs, error: err3 } = await supabase.from('aggregator_profiles').select('*');
  return NextResponse.json({ profiles, recyclers, aggs, err1, err2, err3 });
}
