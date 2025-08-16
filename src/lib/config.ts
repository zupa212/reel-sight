// App Configuration - TEMPORARY hardcoded values for public testing
export const APP_CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: "https://gmhirmoqzuipceblfzfe.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaGlybW9xenVpcGNlYmxmemZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDMwMTUsImV4cCI6MjA3MDg3OTAxNX0.UXGNnX0BIGXoAjhdXOdNA2CMuRQATQA-UBz-i27Ude4",
  
  // Edge Function URLs
  ENABLE_MODEL_URL: "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/enable_model",
  APIFY_WEBHOOK_URL: "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/apify_webhook",
  
  // Default workspace for public testing
  DEFAULT_WORKSPACE_ID: "07ac503e-47b5-45a7-b13f-d0cc7ec1cec1", // Default Workspace UUID
  
  // Authentication disabled for public testing
  AUTH_ENABLED: false,
} as const;

// Helper functions
export const getDefaultWorkspaceId = (): string | null => {
  if (!APP_CONFIG.DEFAULT_WORKSPACE_ID) {
    return null;
  }
  return APP_CONFIG.DEFAULT_WORKSPACE_ID;
};

export const isWorkspaceConfigured = (): boolean => {
  return getDefaultWorkspaceId() !== null;
};

export const getMaskedAnonKey = (): string => {
  const key = APP_CONFIG.SUPABASE_ANON_KEY;
  return key.substring(0, 20) + "..." + key.substring(key.length - 10);
};