import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, User, Clock, Database, Loader2 } from "lucide-react";
import { WorkspaceBanner } from "@/components/ui/workspace-banner";
import { APP_CONFIG, getDefaultWorkspaceId, isWorkspaceConfigured } from "@/lib/config";
import { track } from "@/lib/track";
import { callEdge } from "@/lib/action";

interface Model {
  id: string;
  username: string;
  display_name: string | null;
  status: 'pending' | 'enabled' | 'disabled';
  last_scraped_at: string | null;
  backfill_completed: boolean;
  created_at: string;
}

export default function Models() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enablingModels, setEnablingModels] = useState<Set<string>>(new Set());

  // Fetch models for default workspace
  const { data: models, isLoading, refetch } = useQuery({
    queryKey: ['models', APP_CONFIG.DEFAULT_WORKSPACE_ID],
    queryFn: async () => {
      track('models:fetch_start');
      
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) {
        throw new Error('Default workspace not configured');
      }

      const { data, error } = await supabase
        .from('models')
        .select(`
          *,
          reels(count)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        track('models:fetch_error', { error: error.message });
        throw error;
      }

      track('models:fetch_ok', { count: data?.length || 0 });
      return data as (Model & { reels: { count: number }[] })[];
    },
    enabled: isWorkspaceConfigured()
  });

  // Check if model has reels
  const hasReels = (model: Model & { reels: { count: number }[] }) => {
    return model.reels && model.reels[0]?.count > 0;
  };

  // Check if model should show "Backfilling..." chip
  const isBackfilling = (model: Model & { reels: { count: number }[] }) => {
    return model.status === 'enabled' && (!hasReels(model) || !model.backfill_completed);
  };

  // Add model
  const handleAddModel = async () => {
    if (!username.trim()) return;

    setIsSubmitting(true);
    track('models:add_clicked', { username });

    try {
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) {
        throw new Error('Default workspace not configured');
      }

      // Sanitize input - strip leading @, lowercase
      const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('models')
        .insert({
          workspace_id: workspaceId,
          username: cleanUsername,
          display_name: displayName.trim() || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      track('models:add_ok', { modelId: data.id, username: cleanUsername });
      toast({
        title: "Model added",
        description: `@${cleanUsername} has been added successfully.`,
      });

      // Reset form and close modal
      setUsername("");
      setDisplayName("");
      setShowAddModal(false);
      refetch();

    } catch (error) {
      track('models:add_error', { error: String(error) });
      toast({
        title: "Error adding model",
        description: error instanceof Error ? error.message : "Failed to add model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enable model
  const handleEnableModel = async (modelId: string) => {
    setEnablingModels(prev => new Set([...prev, modelId]));
    track('models:enable_clicked', { modelId });

    try {
      const result = await callEdge(APP_CONFIG.ENABLE_MODEL_URL, { modelId });
      
      if (!result.ok) {
        throw new Error(result.error);
      }

      track('models:enable_ok', { modelId });
      toast({
        title: "Backfill started",
        description: "Model enabled and backfill process initiated.",
      });

      refetch();

    } catch (error) {
      track('models:enable_error', { modelId, error: String(error) });
      toast({
        title: "Enable failed",
        description: error instanceof Error ? error.message : "Failed to enable model",
        variant: "destructive",
      });
    } finally {
      setEnablingModels(prev => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  // Disable model
  const handleDisableModel = async (modelId: string) => {
    track('models:disable_clicked', { modelId });

    try {
      const { error } = await supabase
        .from('models')
        .update({ status: 'disabled' })
        .eq('id', modelId);

      if (error) throw error;

      track('models:disable_ok', { modelId });
      toast({
        title: "Tracking disabled",
        description: "Model has been disabled. Scheduled scrapes will ignore this model.",
      });

      refetch();

    } catch (error) {
      track('models:disable_error', { modelId, error: String(error) });
      toast({
        title: "Disable failed",
        description: error instanceof Error ? error.message : "Failed to disable model",
        variant: "destructive",
      });
    }
  };

  // Toggle model status
  const handleToggleModel = async (model: Model & { reels: { count: number }[] }) => {
    if (model.status === 'enabled') {
      await handleDisableModel(model.id);
    } else {
      await handleEnableModel(model.id);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'enabled': return 'default' as const;
      case 'pending': return 'secondary' as const;
      case 'disabled': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const formatLastScraped = (lastScrapedAt: string | null) => {
    if (!lastScrapedAt) return "Never";
    
    const date = new Date(lastScrapedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Recently";
  };

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <WorkspaceBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Models</h1>
          <p className="text-muted-foreground">Manage Instagram models for content tracking</p>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button disabled={!isWorkspaceConfigured()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Add an Instagram model to start tracking their content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Instagram Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username or username"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Friendly name for display"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddModel} 
                  disabled={!username.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Model"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Models List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-6 bg-muted rounded w-48"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : models && models.length > 0 ? (
        <div className="grid gap-4">
          {models.map((model) => (
            <Card key={model.id} className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {model.display_name || `@${model.username}`}
                        </h3>
                        {model.display_name && (
                          <span className="text-sm text-muted-foreground">@{model.username}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last scraped: {formatLastScraped(model.last_scraped_at)}
                        </div>
                        {hasReels(model) && (
                          <div className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {model.reels[0].count} reels
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isBackfilling(model) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Backfilling...
                      </Badge>
                    )}
                    
                    <Badge variant={getStatusVariant(model.status)}>
                      {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                    </Badge>
                    
                    <Button
                      variant={model.status === 'enabled' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleModel(model)}
                      disabled={enablingModels.has(model.id) || !isWorkspaceConfigured()}
                    >
                      {enablingModels.has(model.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Working...
                        </>
                      ) : model.status === 'enabled' ? (
                        'Disable'
                      ) : (
                        'Enable'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-12 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No models yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first Instagram model to start tracking content and analytics
            </p>
            {isWorkspaceConfigured() && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Model
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}