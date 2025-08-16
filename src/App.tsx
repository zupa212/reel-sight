import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Reels from "./pages/Reels";
import Health from "./pages/Health";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Performance from "./pages/Performance";
import Workspace from "./pages/Workspace";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/models" element={<AppLayout />}>
              <Route index element={<Models />} />
            </Route>
            <Route path="/reels" element={<AppLayout />}>
              <Route index element={<Reels />} />
            </Route>
            <Route path="/profile" element={<AppLayout />}>
              <Route index element={<Profile />} />
            </Route>
            <Route path="/settings" element={<AppLayout />}>
              <Route index element={<Settings />} />
            </Route>
            <Route path="/performance" element={<AppLayout />}>
              <Route index element={<Performance />} />
            </Route>
            <Route path="/workspace" element={<AppLayout />}>
              <Route index element={<Workspace />} />
            </Route>
            <Route path="/dev/health" element={<AppLayout />}>
              <Route index element={<Health />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
