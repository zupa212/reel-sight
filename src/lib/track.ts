export async function track(
  event: string, 
  context: Record<string, any> = {}, 
  page = window.location.pathname
) {
  try {
    const logEventUrl = "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/log_event";
    
    await fetch(logEventUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, context, page })
    });
  } catch (error) {
    // Silently fail analytics - don't break user experience
    console.debug("Analytics tracking failed:", error);
  }
}