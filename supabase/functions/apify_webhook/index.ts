import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source") || "unknown";
    const secret = url.searchParams.get("secret");
    
    // Validate secret
    const expectedSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response("Unauthorized", { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const payload = await req.json();
    const payloadString = JSON.stringify(payload);
    
    // Compute dedupe hash from runId + datasetId
    const runId = payload.data?.id || payload.id || "";
    const datasetId = payload.resource?.defaultDatasetId || "";
    const dedupeKey = `${runId}-${datasetId}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(dedupeKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Processing Apify webhook from ${source}, hash: ${hash}`);

    // Insert into webhooks_inbox with dedupe protection
    const { error: insertError } = await supabase
      .from("webhooks_inbox")
      .insert({
        source,
        payload,
        hash,
        dedupe_key: dedupeKey,
        processed: false
      });

    if (insertError) {
      // If it's a duplicate key error, that's fine - just log and continue
      if (insertError.code === '23505') {
        console.log(`Webhook already processed: ${hash}`);
      } else {
        console.error("Error inserting webhook:", insertError);
        throw insertError;
      }
    }

    // Upsert cron_status for apify_webhook_last
    await supabase.from("cron_status").upsert({
      name: "apify_webhook_last",
      last_run_at: new Date().toISOString(),
      last_ok: true,
      last_message: `Webhook received: ${source}`
    });

    return new Response(JSON.stringify({ ok: true, hash }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Unexpected error in apify_webhook:", error);
    
    // Update cron status with error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      await supabase.from("cron_status").upsert({
        name: "apify_webhook_last",
        last_run_at: new Date().toISOString(),
        last_ok: false,
        last_message: `Error: ${error.message}`
      });
    } catch (statusError) {
      console.error("Error updating cron status:", statusError);
    }

    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});