import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { ethers } from 'https://esm.sh/ethers@6.8.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      event_type,
      batch_id,
      batch_transport_event_id,
      scan_lat,
      scan_lng,
      timestamp_iso,
    } = await req.json();

    if (!batch_id || !batch_transport_event_id) {
      throw new Error('Missing batch IDs');
    }

    const providerUrl = Deno.env.get('NEXT_PUBLIC_POLYGON_AMOY_RPC') || 'https://rpc-amoy.polygon.technology';
    const privateKey = Deno.env.get('BLOCKCHAIN_PRIVATE_KEY');
    const contractAddress = Deno.env.get('RECCO_LOGGER_ADDRESS');

    if (!privateKey || !contractAddress) {
      console.error('Missing blockchain configuration. Skipping on-chain logging.');
      return new Response(JSON.stringify({ message: 'Skipped on-chain logging' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abi = [
      "function recordPickup(string batchId, string eventId, int256 lat, int256 lng, uint256 timestamp) external",
      "function recordDelivery(string batchId, string eventId, int256 lat, int256 lng, uint256 timestamp) external"
    ];

    const loggerContract = new ethers.Contract(contractAddress, abi, wallet);

    // Convert lat/lng to scaled integers (e.g. * 10^6) for solidity int256
    const latInt = scan_lat ? Math.round(scan_lat * 1000000) : 0;
    const lngInt = scan_lng ? Math.round(scan_lng * 1000000) : 0;
    const unixTimestamp = Math.floor(new Date(timestamp_iso).getTime() / 1000);

    let txHash: string | null = null;

    if (event_type === 'PICKUP_CONFIRMED') {
      const tx = await loggerContract.recordPickup(batch_id, batch_transport_event_id, latInt, lngInt, unixTimestamp);
      txHash = tx.hash;
    } else if (event_type === 'DELIVERY_CONFIRMED') {
      const tx = await loggerContract.recordDelivery(batch_id, batch_transport_event_id, latInt, lngInt, unixTimestamp);
      txHash = tx.hash;
    } else {
      throw new Error(`Invalid event_type: ${event_type}`);
    }

    if (txHash) {
      // Update the DB records with the pickup hash or delivery hash
      let fieldToUpdate = event_type === 'PICKUP_CONFIRMED' ? 'pickup_hash' : 'delivery_hash';
      
      // Update `batches`
      await supabaseClient
        .from('batches')
        .update({ [fieldToUpdate]: txHash })
        .eq('id', batch_id);

      // Update `batch_transport_events`
      await supabaseClient
        .from('batch_transport_events')
        .update({ [fieldToUpdate]: txHash })
        .eq('id', batch_transport_event_id);
    }

    return new Response(JSON.stringify({ hash: txHash }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error logging transport event:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
