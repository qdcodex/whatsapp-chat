// Registers this device for push notifications after login:
// the ME2 Android app uses Firebase (Capacitor plugin), browsers use Web Push.
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'me2-push-token';

function rememberToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
}

async function saveToken(body: Record<string, unknown>) {
  await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function vapidKeyBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

let started = false;

export async function registerPush(): Promise<void> {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    if (Capacitor.isNativePlatform()) await registerNative();
    else await registerWeb();
  } catch (err) {
    console.warn('[push] registration skipped:', err instanceof Error ? err.message : err);
  }
}

async function registerNative() {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return;

  // Android 8+ shows notifications per channel; this one is for chat messages
  await PushNotifications.createChannel({
    id: 'messages', name: 'Messages', description: 'New chat messages',
    importance: 4, visibility: 1, vibration: true,
  }).catch(() => {});

  await PushNotifications.addListener('registration', async ({ value }) => {
    rememberToken(value);
    await saveToken({ platform: 'fcm', token: value });
  });
  await PushNotifications.addListener('registrationError', (e) => {
    console.warn('[push] FCM registration failed:', e.error);
  });
  // Tapping a notification opens the matching chat page
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = notification.data?.url;
    if (typeof url === 'string' && url.startsWith('/') && window.location.pathname !== url) {
      window.location.assign(url);
    }
  });
  await PushNotifications.register();
}

async function registerWeb() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  // The service worker only exists in production builds
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(publicKey) }));
  const json = sub.toJSON();
  rememberToken(json.endpoint!);
  await saveToken({ platform: 'web', subscription: json });
}

// On logout: stop sending this account's notifications to this device
export async function unregisterPush(): Promise<void> {
  let token: string | null = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  if (!token) return;
  await fetch('/api/push/register', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {});
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}
