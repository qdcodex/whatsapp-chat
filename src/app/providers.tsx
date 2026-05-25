"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { StoreInitializer } from "@/components/StoreInitializer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SocketProvider } from "@/components/SocketProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StoreInitializer />
          <InstallPrompt />
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </SocketProvider>
  );
}
