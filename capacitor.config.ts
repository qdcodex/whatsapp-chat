import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is a native shell around the live deployed site, because the
// app needs its server (API, MongoDB, Socket.IO). Set CAP_SERVER_URL to the
// production https URL before running `npx cap sync android`.
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.me2.app',
  appName: 'ME2 App',
  // Fallback page only; the app loads serverUrl
  webDir: 'mobile/www',
  server: serverUrl
    ? { url: serverUrl, cleartext: serverUrl.startsWith('http://'), androidScheme: 'https' }
    : undefined,
};

export default config;
