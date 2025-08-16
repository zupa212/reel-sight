import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { 
  BarChart3, 
  Users, 
  Settings, 
  PlayCircle,
  Building2,
  UserCog,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    title: 'Analytics',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: BarChart3
      },
      {
        title: 'Reels',
        url: '/reels',
        icon: PlayCircle
      },
      {
        title: 'Performance',
        url: '/performance',
        icon: Activity
      }
    ]
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Models',
        url: '/models',
        icon: Users
      },
      {
        title: 'Workspace',
        url: '/workspace',
        icon: Building2
      }
    ]
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'Profile',
        url: '/profile',
        icon: UserCog
      },
      {
        title: 'Preferences',
        url: '/settings',
        icon: Settings
      }
    ]
  }
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-6">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
            ModelFlow
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-semibold uppercase tracking-wider px-4">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "mx-2 rounded-lg transition-all duration-200",
                          isActive 
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        )}
                      >
                        <Link to={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <div className="text-xs text-sidebar-foreground/60">
            © 2024 ModelFlow
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}