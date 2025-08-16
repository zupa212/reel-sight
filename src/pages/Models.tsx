import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Users, 
  MoreVertical, 
  Trash2, 
  Play, 
  Pause, 
  ExternalLink,
  Calendar,
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useModels, useAddModel, useReels } from '@/lib/supabase-queries';
import { track } from '@/lib/track';
import { callEdge } from '@/lib/action';
import { addModelSchema } from '@/lib/validation';

type ModelStatus = 'enabled' | 'disabled' | 'pending';

export default function Models() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModelUsername, setNewModelUsername] = useState('');
  const [newModelDisplayName, setNewModelDisplayName] = useState('');
  const [enablingModels, setEnablingModels] = useState<Set<string>>(new Set());
  const [backfillingModels, setBackfillingModels] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const { data: models, isLoading, error } = useModels();
  const { data: reels } = useReels();
  const addModelMutation = useAddModel();

  // Count reels per model
  const reelsCount = useMemo(() => {
    const counts = new Map<string, number>();
    reels?.forEach(reel => {
      counts.set(reel.model_id, (counts.get(reel.model_id) || 0) + 1);
    });
    return counts;
  }, [reels]);

  const handleAddModel = async () => {
    if (!newModelUsername.trim()) return;
    
    // Clean username (remove @ if present)
    const cleanUsername = newModelUsername.replace(/^@/, '');
    
    track('models:add_clicked', { username: cleanUsername });
    
    try {
      const validatedData = addModelSchema.parse({
        username: cleanUsername,
        displayName: newModelDisplayName || undefined
      });
      
      await addModelMutation.mutateAsync({
        username: validatedData.username,
        displayName: validatedData.displayName
      });
      
      toast({
        title: "Model added",
        description: `@${validatedData.username} has been added to your tracking list.`
      });
      
      setNewModelUsername('');
      setNewModelDisplayName('');
      setIsAddModalOpen(false);
      
      track('models:add_success', { username: validatedData.username });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      track('models:add_failed', { error: errorMessage });
      
      toast({
        variant: "destructive",
        title: "Failed to add model",
        description: errorMessage
      });
    }
  };

  const handleEnableModel = async (modelId: string, modelUsername: string) => {
    track('models:enable_clicked', { modelId });
    setEnablingModels(prev => new Set(prev).add(modelId));
    setBackfillingModels(prev => new Set(prev).add(modelId));
    
    try {
      const result = await callEdge(
        "https://gmhirmoqzuipceblfzfe.supabase.co/functions/v1/enable_model",
        { modelId }
      );
      
      if (result.ok) {
        toast({
          title: "Backfill started",
          description: `Scraping has been enabled for @${modelUsername}. Backfill is now in progress.`
        });
        track('models:enable_success', { modelId });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      track('models:enable_failed', { modelId, error: errorMessage });
      
      toast({
        variant: "destructive",
        title: "Failed to enable model",
        description: errorMessage
      });
    } finally {
      setEnablingModels(prev => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  // Check if model has reels and backfill is completed
  const hasReels = (modelId: string) => {
    const model = models?.find(m => m.id === modelId);
    return model?.backfill_completed && (reelsCount.get(modelId) || 0) > 0;
  };

  const getLastScrapedText = (model: any) => {
    if (!model.last_scraped_at) return "Never scraped";
    const timeDiff = Date.now() - new Date(model.last_scraped_at).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const getStatusBadge = (enabled: boolean) => {
    if (enabled) {
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Enabled</Badge>;
    } else {
      return <Badge variant="secondary">Disabled</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Models</h1>
          <Button disabled>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">Error loading models</h2>
          <p className="text-muted-foreground mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Models</h1>
          <p className="text-muted-foreground">
            Manage your Instagram creator models and their tracking status
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Add a new Instagram creator to track their Reels performance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Instagram Username</Label>
                <Input
                  id="username"
                  placeholder="e.g., @model_sarah or model_sarah"
                  value={newModelUsername}
                  onChange={(e) => setNewModelUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Sarah Johnson"
                  value={newModelDisplayName}
                  onChange={(e) => setNewModelDisplayName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddModel}
                disabled={addModelMutation.isPending}
              >
                {addModelMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Add Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Models
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {models?.filter(m => m.status === 'enabled').length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enabled Models
            </CardTitle>
            <Play className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {models?.filter(m => m.status === 'enabled').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Setup
            </CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {models?.filter(m => m.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting backfill
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Updated
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {models?.find(m => m.last_daily_scrape_at) 
                ? formatDate(models.find(m => m.last_daily_scrape_at)?.last_daily_scrape_at || null)
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Latest scrape
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Models Table */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle>Your Models</CardTitle>
          <CardDescription>
            Manage tracking settings for each Instagram creator
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!models || models.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No models yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first Instagram creator to track
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Model
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Backfill</TableHead>
                  <TableHead>Last Daily Scrape</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">@{model.username}</div>
                          {model.status === 'enabled' && !hasReels(model.id) && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              Backfilling...
                            </Badge>
                          )}
                        </div>
                        {model.display_name && (
                          <div className="text-sm text-muted-foreground">{model.display_name}</div>
                        )}
                        {model.status === 'enabled' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last scraped: {getLastScrapedText(model)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(model.status === 'enabled')}
                        {backfillingModels.has(model.id) && (
                          <Badge variant="outline" className="text-xs">
                            Backfilling last 30 days...
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(model.last_backfill_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(model.last_daily_scrape_at)}
                    </TableCell>
                    <TableCell>
                      {model.status !== 'enabled' && (
                        <Button
                          size="sm"
                          onClick={() => handleEnableModel(model.id, model.username)}
                          disabled={enablingModels.has(model.id)}
                        >
                          {enablingModels.has(model.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Enabling...
                            </>
                          ) : (
                            'Enable Scraping'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}