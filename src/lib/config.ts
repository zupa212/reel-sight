// Configuration for public testing mode
export const CONFIG = {
  // Supabase URLs (hardcoded as VITE_* vars not supported)
  SUPABASE_URL: "https://gmhirmoqzuipceblfzfe.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaGlybW9xenVpcGNlYmxmemZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDMwMTUsImV4cCI6MjA3MDg3OTAxNX0.UXGNnX0BIGXoAjhdXOdNA2CMuRQATQA-UBz-i27Ude4",
  
  // Edge Function URLs
  ENABLE_MODEL_URL: "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/enable_model",
  APIFY_WEBHOOK_URL: "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/apify_webhook",
  
  // Default workspace for public testing
  // TODO: Replace with actual UUID of "Default Workspace" row
  DEFAULT_WORKSPACE_ID: "00000000-0000-0000-0000-000000000000", // Placeholder - needs real UUID
  
  // Public testing mode (no auth required)
  PUBLIC_TESTING_MODE: true,
};

// Helper to get default workspace ID with fallback
export const getDefaultWorkspaceId = (): string | null => {
  if (!CONFIG.DEFAULT_WORKSPACE_ID || CONFIG.DEFAULT_WORKSPACE_ID === "00000000-0000-0000-0000-000000000000") {
    return null;
  }
  return CONFIG.DEFAULT_WORKSPACE_ID;
};

// Check if workspace is configured
export const isWorkspaceConfigured = (): boolean => {
  return getDefaultWorkspaceId() !== null;
};