import type { Metadata, Viewport } from "next";
import "@/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chathub",
  description: "Simple. Reliable. Private.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BroadcastHub",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "BroadcastHub",
    description: "Simple. Reliable. Private.",
  },
};

export const viewport: Viewport = {
  themeColor: "#075e54",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BroadcastHub" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
