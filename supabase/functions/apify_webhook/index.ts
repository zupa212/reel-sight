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
    
    // Verify webhook secret
    const expectedSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      return new Response("Unauthorized", { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const payload = await req.json();
    
    // Create hash for deduplication using Web Crypto API
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Processing Apify webhook from ${source}, hash: ${hash}`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));

    // Process Apify webhook data
    if (payload.resource?.defaultDatasetId) {
      const datasetId = payload.resource.defaultDatasetId;
      console.log(`Fetching dataset items from: ${datasetId}`);
      
      try {
        // Fetch dataset items from Apify
        const apifyToken = Deno.env.get("APIFY_TOKEN");
        if (!apifyToken) {
          throw new Error("APIFY_TOKEN not configured");
        }

        const datasetResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (!datasetResponse.ok) {
          throw new Error(`Apify API error: ${datasetResponse.status}`);
        }

        const items = await datasetResponse.json();
        console.log(`Processing ${items.length} reel items`);

        let processedReels = 0;
        let errors = 0;

        for (const item of items) {
          try {
            // Find model by Instagram username
            const { data: model } = await supabase
              .from("models")
              .select("*")
              .eq("username", item.ownerUsername)
              .single();

            if (!model) {
              console.log(`Model not found for username: ${item.ownerUsername}`);
              continue;
            }

            // Upsert reel data
            const reelData = {
              workspace_id: model.workspace_id,
              model_id: model.id,
              platform_post_id: item.id,
              url: item.url,
              caption: item.caption || "",
              hashtags: item.hashtags || [],
              posted_at: new Date(item.timestamp).toISOString(),
              duration_seconds: item.videoDuration || null,
              thumbnail_url: item.displayUrl || null
            };

            const { data: reel, error: reelError } = await supabase
              .from("reels")
              .upsert(reelData, { 
                onConflict: 'workspace_id,platform_post_id',
                ignoreDuplicates: false 
              })
              .select()
              .single();

            if (reelError) {
              console.error(`Error upserting reel ${item.id}:`, reelError);
              errors++;
              continue;
            }

            // Upsert daily metrics
            const today = new Date().toISOString().split('T')[0];
            const metricsData = {
              day: today,
              workspace_id: model.workspace_id,
              model_id: model.id,
              reel_id: reel.id,
              views: item.videoPlayCount || item.videoViewCount || 0,
              likes: item.likesCount || 0,
              comments: item.commentsCount || 0,
              saves: 0, // Not available in Apify data
              shares: 0, // Not available in Apify data
              watch_time_seconds: 0, // Not available in Apify data
              completion_rate: null // Not available in Apify data
            };

            const { error: metricsError } = await supabase
              .from("reel_metrics_daily")
              .upsert(metricsData, { 
                onConflict: 'day,reel_id',
                ignoreDuplicates: false 
              });

            if (metricsError) {
              console.error(`Error upserting metrics for reel ${item.id}:`, metricsError);
              errors++;
            } else {
              processedReels++;
            }

          } catch (itemError) {
            console.error(`Error processing item ${item.id}:`, itemError);
            errors++;
          }
        }

        // Update models to mark backfill as completed and update last_scraped_at
        const uniqueModelIds = [...new Set(items.map(item => {
          const model = models?.find(m => m.username === item.ownerUsername);
          return model?.id;
        }).filter(Boolean))];
        
        for (const modelId of uniqueModelIds) {
          await supabase
            .from("models")
            .update({ 
              last_scraped_at: new Date().toISOString(),
              backfill_completed: true
            })
            .eq("id", modelId);
        }

        // Update cron status
        await supabase.from("cron_status").upsert({
          name: "apify_webhook_last",
          last_run_at: new Date().toISOString(),
          last_ok: errors === 0,
          last_message: `Processed ${processedReels} reels, ${errors} errors`
        });

        // Update model's last scraped time and backfill completion
        if (processedReels > 0) {
          const processedModelIds = [...new Set(Object.values(modelMap))];
          for (const modelId of processedModelIds) {
            await supabase
              .from("models")
              .update({ 
                last_scraped_at: new Date().toISOString(),
                backfill_completed: true 
              })
              .eq("id", modelId);
          }
        }

        console.log(`Webhook processing complete: ${processedReels} reels processed, ${errors} errors`);

      } catch (datasetError) {
        console.error("Error processing dataset:", datasetError);
        
        // Update cron status with error
        await supabase.from("cron_status").upsert({
          name: "apify_webhook_last",
          last_run_at: new Date().toISOString(),
          last_ok: false,
          last_message: `Dataset processing error: ${datasetError.message}`
        });
      }
    }

    // Log webhook receipt
    await supabase.from("event_logs").insert({
      event: "webhook:received",
      level: "info",
      context: { 
        source, 
        hash, 
        payloadSize: payloadString.length,
        datasetId: payload.resource?.defaultDatasetId || null
      },
      page: "webhook"
    });

    return new Response(JSON.stringify({ ok: true, hash }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Unexpected error in apify_webhook:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});