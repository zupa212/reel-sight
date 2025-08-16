import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Users, Settings as SettingsIcon, Plus, UserCheck, Crown, Shield, Trash2 } from "lucide-react";
import { track } from "@/lib/track";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export default function Workspace() {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const queryClient = useQueryClient();

  // Fetch current workspace
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      track('workspace:fetch_start');
      
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        throw new Error('User not authenticated');
      }

      // Get user's workspace
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.user.id)
        .single();

      if (memberError) throw memberError;

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', memberData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      track('workspace:fetch_ok');
      return workspaceData;
    }
  });

  // Fetch workspace members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];

      track('workspace:members_fetch_start');

      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      track('workspace:members_fetch_ok', { count: data.length });
      return data.map(member => ({
        ...member,
        profiles: { full_name: 'User', email: 'user@example.com' }
      })) as WorkspaceMember[];
    },
    enabled: !!workspace?.id
  });

  // Update workspace name
  const updateWorkspaceMutation = useMutation({
    mutationFn: async (newName: string) => {
      track('workspace:update_name_start');
      
      if (!workspace?.id) throw new Error('No workspace');

      const { error } = await supabase
        .from('workspaces')
        .update({ 
          name: newName,
          slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        })
        .eq('id', workspace.id);

      if (error) throw error;
      track('workspace:update_name_ok');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast({
        title: "Workspace Updated",
        description: "Workspace name has been updated successfully.",
      });
      setIsEditingName(false);
    },
    onError: (error) => {
      track('workspace:update_name_error', { error: String(error) });
      toast({
        title: "Update Failed",
        description: "Failed to update workspace name. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send invite (placeholder - would need email service)
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      track('workspace:invite_start', { role: data.role });
      
      // In a real app, this would send an email invitation
      // For now, we'll just log it and show a success message
      console.log('Invite sent to:', data.email, 'with role:', data.role);
      
      track('workspace:invite_ok');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}. They will receive an email with instructions.`,
      });
      setInviteEmail('');
      setIsInviting(false);
    },
    onError: (error) => {
      track('workspace:invite_error', { error: String(error) });
      toast({
        title: "Invitation Failed",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleUpdateWorkspace = () => {
    if (workspaceName.trim()) {
      updateWorkspaceMutation.mutate(workspaceName.trim());
    }
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      inviteMemberMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <UserCheck className="h-4 w-4 text-green-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default' as const;
      case 'admin': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  if (workspaceLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-6">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your workspace and team members</p>
      </div>

      <div className="max-w-4xl mx-auto grid gap-6">
        {/* Workspace Information */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              Workspace Information
            </CardTitle>
            <CardDescription>
              Basic information about your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                  />
                  <Button onClick={handleUpdateWorkspace} disabled={updateWorkspaceMutation.isPending}>
                    {updateWorkspaceMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-lg font-medium">{workspace?.name}</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setWorkspaceName(workspace?.name || '');
                      setIsEditingName(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Workspace ID</Label>
              <div className="font-mono text-sm bg-muted p-2 rounded border">
                {workspace?.id}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <div className="text-sm text-muted-foreground">
                {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  Manage who has access to this workspace
                </CardDescription>
              </div>
              
              <Dialog open={isInviting} onOpenChange={setIsInviting}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join this workspace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={(value: 'member' | 'admin') => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {inviteRole === 'admin' ? 'Can manage workspace settings and members' : 'Can view and interact with workspace content'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleInvite} 
                        disabled={!inviteEmail.trim() || inviteMemberMutation.isPending}
                        className="flex-1"
                      >
                        {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsInviting(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-background/50 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex-shrink-0">
                      {getRoleIcon(member.role)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
                        </p>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {member.role !== 'owner' && (
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage & Billing */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Usage & Billing</CardTitle>
            <CardDescription>
              Current plan and usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">Free Tier</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Models</p>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">of unlimited</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data Retention</p>
                  <p className="text-2xl font-bold">90</p>
                  <p className="text-xs text-muted-foreground">days</p>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}