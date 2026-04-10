"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-8 text-center bg-background">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 15.536a5 5 0 010-7.072M12 12h.01" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-foreground">You&apos;re Offline</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        No internet connection detected. Please check your network and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
      >
        Try Again
      </button>
    </div>
  );
}
