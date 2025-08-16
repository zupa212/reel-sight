import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceBanner } from '@/components/ui/workspace-banner';
import { CONFIG } from '@/lib/config';

export function AppLayout() {
  // Skip auth check in public testing mode
  if (CONFIG.PUBLIC_TESTING_MODE) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto">
                <div className="h-full p-6">
                  <WorkspaceBanner />
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    );
  }

  // Legacy auth-based layout (keeping for future auth implementation)
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto">
              <div className="h-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}