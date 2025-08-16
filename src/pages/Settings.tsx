import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Bell, Shield, Palette, Monitor } from "lucide-react";
import { track } from "@/lib/track";

interface UserSettings {
  notifications_enabled: boolean;
  email_digest: 'daily' | 'weekly' | 'monthly' | 'disabled';
  theme_preference: 'light' | 'dark' | 'system';
  data_retention_days: number;
  auto_refresh_enabled: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    email_digest: 'weekly',
    theme_preference: 'system',
    data_retention_days: 90,
    auto_refresh_enabled: true,
  });

  const queryClient = useQueryClient();

  // Fetch user settings
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      track('settings:fetch_start');
      
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

      track('settings:fetch_ok');
      return data;
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      track('settings:update_start', { fields: Object.keys(newSettings) });
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // For now, we'll store settings in localStorage and profiles table
      // In a real app, you'd have a dedicated settings table
      localStorage.setItem('userSettings', JSON.stringify({...settings, ...newSettings}));
      
      // Update theme-related settings in profiles
      const profileUpdates: any = {};
      if ('theme_preference' in newSettings) {
        // Apply theme immediately
        const theme = newSettings.theme_preference;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.user.id,
            email: user.user.email,
            ...profileUpdates
          });

        if (error) throw error;
      }

      track('settings:update_ok');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      track('settings:update_error', { error: String(error) });
      toast({
        title: "Update Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and notifications</p>
      </div>

      <div className="max-w-4xl mx-auto grid gap-6">
        {/* Notifications */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about important events
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications_enabled}
                onCheckedChange={(checked) => handleSettingChange('notifications_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Email Digest Frequency</Label>
              <Select
                value={settings.email_digest}
                onValueChange={(value) => handleSettingChange('email_digest', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How often to receive email summaries of your analytics
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Theme Preference</Label>
              <Select
                value={settings.theme_preference}
                onValueChange={(value) => handleSettingChange('theme_preference', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Control how your data is stored and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Data Retention Period</Label>
              <Select
                value={settings.data_retention_days.toString()}
                onValueChange={(value) => handleSettingChange('data_retention_days', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How long to keep your analytics data
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh">Auto-refresh Data</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh analytics data every few minutes
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={settings.auto_refresh_enabled}
                onCheckedChange={(checked) => handleSettingChange('auto_refresh_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Performance
            </CardTitle>
            <CardDescription>
              Optimize application performance for your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reduced Motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations for better performance
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Data Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use compressed images and reduce API calls
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 to-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Delete All Data</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your analytics data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Data
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}