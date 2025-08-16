import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { isWorkspaceConfigured } from "@/lib/config";

export function WorkspaceBanner() {
  if (isWorkspaceConfigured()) {
    return null;
  }

  return (
    <Alert className="mb-4 border-warning bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning-foreground">
        <strong>Default workspace not configured.</strong> Some features may not work properly. 
        Please set the DEFAULT_WORKSPACE_ID in the configuration.
      </AlertDescription>
    </Alert>
  );
}