import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ModelStatus = 'enabled' | 'disabled' | 'pending';

interface Model {
  id: string;
  username: string;
  displayName: string;
  status: ModelStatus;
  lastScraped: string | null;
  backfillCompleted: boolean;
  totalReels: number;
  totalViews: string;
  averageEngagement: string;
  createdAt: string;
}

export default function Models() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModelUsername, setNewModelUsername] = useState('');
  const [newModelDisplayName, setNewModelDisplayName] = useState('');

  // Mock data for demo purposes
  const [models, setModels] = useState<Model[]>([
    {
      id: '1',
      username: 'model_sarah',
      displayName: 'Sarah Johnson',
      status: 'enabled',
      lastScraped: '2024-08-16T10:30:00Z',
      backfillCompleted: true,
      totalReels: 45,
      totalViews: '284K',
      averageEngagement: '5.2%',
      createdAt: '2024-07-15T09:00:00Z'
    },
    {
      id: '2',
      username: 'fitness_emma',
      displayName: 'Emma Wilson',
      status: 'enabled',
      lastScraped: '2024-08-16T09:15:00Z',
      backfillCompleted: true,
      totalReels: 38,
      totalViews: '192K',
      averageEngagement: '4.8%',
      createdAt: '2024-07-10T14:20:00Z'
    },
    {
      id: '3',
      username: 'lifestyle_alex',
      displayName: 'Alex Thompson',
      status: 'disabled',
      lastScraped: '2024-08-14T16:45:00Z',
      backfillCompleted: true,
      totalReels: 42,
      totalViews: '156K',
      averageEngagement: '4.1%',
      createdAt: '2024-07-05T11:30:00Z'
    },
    {
      id: '4',
      username: 'beauty_mia',
      displayName: 'Mia Chen',
      status: 'pending',
      lastScraped: null,
      backfillCompleted: false,
      totalReels: 0,
      totalViews: '0',
      averageEngagement: '0%',
      createdAt: '2024-08-16T08:00:00Z'
    }
  ]);

  const handleAddModel = () => {
    if (!newModelUsername.trim()) return;

    const newModel: Model = {
      id: Date.now().toString(),
      username: newModelUsername.replace('@', ''),
      displayName: newModelDisplayName || newModelUsername,
      status: 'pending',
      lastScraped: null,
      backfillCompleted: false,
      totalReels: 0,
      totalViews: '0',
      averageEngagement: '0%',
      createdAt: new Date().toISOString()
    };

    setModels(prev => [...prev, newModel]);
    setNewModelUsername('');
    setNewModelDisplayName('');
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (modelId: string) => {
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { 
            ...model, 
            status: model.status === 'enabled' ? 'disabled' : 'enabled'
          }
        : model
    ));
  };

  const handleDeleteModel = (modelId: string) => {
    setModels(prev => prev.filter(model => model.id !== modelId));
  };

  const getStatusBadge = (status: ModelStatus) => {
    switch (status) {
      case 'enabled':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Enabled</Badge>;
      case 'disabled':
        return <Badge variant="secondary">Disabled</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

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
                  placeholder="e.g., model_sarah"
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
              <Button onClick={handleAddModel}>
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
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">
              {models.filter(m => m.status === 'enabled').length} active
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
              {models.filter(m => m.status === 'enabled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reels
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.reduce((sum, model) => sum + model.totalReels, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all models
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
              {models.filter(m => m.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting backfill
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle>Your Models</CardTitle>
          <CardDescription>
            Manage tracking settings for each Instagram creator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {model.displayName.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{model.displayName}</h3>
                      {getStatusBadge(model.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{model.username}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{model.totalReels} reels</span>
                      <span>{model.totalViews} views</span>
                      <span>{model.averageEngagement} engagement</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Last scraped:</p>
                    <p>{formatDate(model.lastScraped)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={model.status === 'enabled'}
                      onCheckedChange={() => handleToggleStatus(model.id)}
                      disabled={model.status === 'pending'}
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Model
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}

            {models.length === 0 && (
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}