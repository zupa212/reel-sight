import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, UserCog, Mail, Upload } from "lucide-react";
import { track } from "@/lib/track";

interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  comfort_mode: boolean;
  high_contrast: boolean;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const queryClient = useQueryClient();

  // Fetch current user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      track('profile:fetch_start');
      
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      track('profile:fetch_ok');
      return data || {
        id: user.user.id,
        email: user.user.email,
        full_name: null,
        avatar_url: null,
        comfort_mode: false,
        high_contrast: false
      };
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileData>) => {
      track('profile:update_start', { fields: Object.keys(updates) });
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.user.id,
          email: user.user.email,
          ...updates
        });

      if (error) throw error;
      track('profile:update_ok');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      track('profile:update_error', { error: String(error) });
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-20 w-20 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your profile information and preferences</p>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <UserCog className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Information */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic profile information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={formData.avatar_url || ''} alt="Profile" />
                <AvatarFallback className="text-lg bg-muted">
                  {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 
                   formData.email ? formData.email.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 2MB
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={formData.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact support if needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility Preferences */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Accessibility Preferences</CardTitle>
            <CardDescription>
              Customize your viewing experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="comfort_mode">Comfort Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Larger text and interface elements
                </p>
              </div>
              <input
                id="comfort_mode"
                type="checkbox"
                checked={formData.comfort_mode || false}
                onChange={(e) => setFormData(prev => ({...prev, comfort_mode: e.target.checked}))}
                disabled={!isEditing}
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high_contrast">High Contrast</Label>
                <p className="text-sm text-muted-foreground">
                  Enhanced contrast for better visibility
                </p>
              </div>
              <input
                id="high_contrast"
                type="checkbox"
                checked={formData.high_contrast || false}
                onChange={(e) => setFormData(prev => ({...prev, high_contrast: e.target.checked}))}
                disabled={!isEditing}
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}