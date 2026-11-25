// Server-only: sends a push notification for a new chat message to every
// recipient's devices — Android app via Firebase Cloud Messaging, browsers via
// Web Push. Unconfigured services are skipped, so local development works without keys.
import * as webpush from 'web-push';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Message as FcmMessage } from 'firebase-admin/messaging';
import { PushTokenModel } from '@/lib/models/PushToken';
import { UserModel } from '@/lib/models/User';
import { GroupModel } from '@/lib/models/Group';

interface ChatMessage {
  id: string;
  senderId: string;
  workspaceId: string;
  adminId?: string;
  recipientId?: string;
  groupId?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
}

const MAX_BODY = 120;

function getFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (!getApps().length) {
    // Stored base64-encoded so the multi-line JSON fits in one env variable
    const json = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    initializeApp({ credential: cert(json) });
  }
  return getMessaging();
}

let vapidReady: boolean | null = null;
function webPushReady(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = !!(pub && priv);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@example.com', pub!, priv!);
  return vapidReady;
}

function previewText(msg: ChatMessage): string {
  if (msg.text?.trim()) {
    const t = msg.text.trim().replace(/\s+/g, ' ');
    return t.length > MAX_BODY ? t.slice(0, MAX_BODY - 1) + '…' : t;
  }
  if (msg.imageUrl) return '📷 Photo';
  if (msg.audioUrl) return '🎤 Voice message';
  return 'New message';
}

// Everyone who should be told about the message, never the sender
async function resolveRecipients(msg: ChatMessage): Promise<{ ids: string[]; groupName?: string }> {
  let ids: string[];
  let groupName: string | undefined;
  if (msg.recipientId) {
    ids = [msg.recipientId];
  } else if (msg.groupId) {
    const group = await GroupModel.findOne({ id: msg.groupId }, { name: 1, memberIds: 1, adminId: 1 }).lean().exec();
    if (!group) return { ids: [] };
    groupName = group.name;
    ids = [...(group.memberIds ?? []), group.adminId];
  } else {
    const users = await UserModel.find({ workspaceId: msg.workspaceId }, { id: 1 }).lean().exec();
    ids = users.map((u) => u.id);
  }
  return { ids: [...new Set(ids)].filter((id) => id && id !== msg.senderId), groupName };
}

export async function notifyNewMessage(msg: ChatMessage): Promise<void> {
  const messaging = getFirebase();
  const web = webPushReady();
  if (!messaging && !web) return;

  const { ids, groupName } = await resolveRecipients(msg);
  if (!ids.length) return;

  const [sender, recipients, tokens] = await Promise.all([
    UserModel.findOne({ id: msg.senderId }, { displayName: 1 }).lean().exec(),
    UserModel.find({ id: { $in: ids } }, { id: 1, role: 1, adminId: 1, workspaceId: 1 }).lean().exec(),
    PushTokenModel.find({ userId: { $in: ids } }).lean().exec(),
  ]);
  if (!tokens.length) return;

  const senderName = sender?.displayName || 'New message';
  const title = groupName ? `${senderName} @ ${groupName}` : senderName;
  const body = previewText(msg);
  const tag = msg.groupId || (msg.recipientId ? `dm-${msg.senderId}` : `broadcast-${msg.workspaceId}`);

  // Admins and users open the app at different pages
  const urlFor = new Map<string, string>();
  for (const r of recipients) {
    urlFor.set(r.id, r.role === 'admin' ? `/admin/${r.workspaceId}` : `/workspace/${r.adminId}`);
  }

  const dead: string[] = [];

  const fcmTokens = tokens.filter((t) => t.platform === 'fcm');
  if (messaging && fcmTokens.length) {
    const messages: FcmMessage[] = fcmTokens.map((t) => ({
      token: t.token,
      notification: { title, body },
      data: { url: urlFor.get(t.userId) ?? '/', messageId: msg.id },
      android: {
        priority: 'high',
        collapseKey: tag,
        notification: { tag, icon: 'ic_stat_me2', color: '#075E54', channelId: 'messages' },
      },
    }));
    const res = await messaging.sendEach(messages);
    res.responses.forEach((r, i) => {
      const code = r.error?.code ?? '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
        dead.push(fcmTokens[i].token);
      } else if (r.error) {
        console.warn('[push] FCM send failed:', code || r.error.message);
      }
    });
  }

  const webTokens = tokens.filter((t) => t.platform === 'web' && t.keys?.p256dh && t.keys?.auth);
  if (web && webTokens.length) {
    await Promise.all(webTokens.map(async (t) => {
      const payload = JSON.stringify({ title, body, tag, url: urlFor.get(t.userId) ?? '/' });
      try {
        await webpush.sendNotification(
          { endpoint: t.token, keys: { p256dh: t.keys!.p256dh, auth: t.keys!.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'high' }
        );
      } catch (err: any) {
        // 404/410: the browser unsubscribed or the subscription expired
        if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(t.token);
        else console.warn('[push] Web Push failed:', err?.statusCode ?? err?.message);
      }
    }));
  }

  if (dead.length) await PushTokenModel.deleteMany({ token: { $in: dead } });
}
