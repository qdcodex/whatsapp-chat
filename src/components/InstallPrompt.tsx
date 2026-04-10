"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not already installed
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg p-3 sm:max-w-sm sm:left-auto sm:right-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Install BroadcastHub</p>
        <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" className="h-8 text-xs rounded-xl" onClick={handleInstall}>
          Install
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShow(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
