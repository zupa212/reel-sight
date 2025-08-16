import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Home from "./pages/Home";
import Models from "./pages/Models";
import Reels from "./pages/Reels";
import Health from "./pages/Health";
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
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<AppLayout />}>
              <Route path="models" element={<Models />} />
              <Route path="reels" element={<Reels />} />
              <Route path="performance" element={<Reels />} />
              <Route path="workspace" element={<Models />} />
              <Route path="profile" element={<Models />} />
              <Route path="settings" element={<Models />} />
              <Route path="dev/health" element={<Health />} />
            </Route>
            <Route path="/models" element={<AppLayout />}>
              <Route index element={<Models />} />
            </Route>
            <Route path="/reels" element={<AppLayout />}>
              <Route index element={<Reels />} />
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
