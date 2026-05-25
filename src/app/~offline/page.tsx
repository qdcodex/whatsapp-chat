"use client";

import { useEffect, useState } from "react";
import { idb } from "@/lib/idb";
import type { Message } from "@/types";
import MessageBubble from "@/components/MessageBubble";
import { WifiOff, CheckCircle2 } from "lucide-react";

export default function OfflinePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCachedMessages = async () => {
      try {
        const cached = await idb.getAllMessages();
        setMessages(cached.sort((a, b) => a.timestamp - b.timestamp));
      } catch (error) {
        console.error("Failed to load cached messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCachedMessages();
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border p-4 safe-area-top">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground">Offline Mode</h1>
            <p className="text-xs text-muted-foreground">You can view cached messages</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading cached messages...</p>
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOutgoing={false}
                currentUserId={msg.senderId}
              />
            ))}
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>End of cached messages</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No cached messages</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Messages will be cached when you go online
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-card border-t border-border p-4 safe-area-bottom">
        <button
          onClick={handleRetry}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
        >
          ✓ Try Going Online
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Messages sync when you reconnect
        </p>
      </div>
    </div>
  );
}
