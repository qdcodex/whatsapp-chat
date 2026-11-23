import { Capacitor } from '@capacitor/core';
import { normalizePhone } from '@/lib/phone';

export interface PhoneContact {
  name: string;
  phone: string; // normalized 10-digit
}

export interface ContactMatch {
  userId: string;
  displayName: string;
}

// True only inside the installed Android/iOS app; the address book isn't
// readable from a normal browser tab.
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function readPhoneContacts(): Promise<PhoneContact[]> {
  // Loaded lazily so the plugin is never touched during server rendering
  const { Contacts } = await import('@capacitor-community/contacts');

  const permission = await Contacts.requestPermissions();
  if (permission.contacts !== 'granted' && permission.contacts !== 'limited') {
    throw new Error('Contacts permission was denied. Allow it in Android settings to import contacts.');
  }

  const { contacts } = await Contacts.getContacts({ projection: { name: true, phones: true } });

  // One row per unique 10-digit number; a contact with two numbers gives two rows
  const byPhone = new Map<string, PhoneContact>();
  for (const c of contacts) {
    const name = c.name?.display?.trim() || '';
    for (const p of c.phones ?? []) {
      const phone = normalizePhone(p.number ?? '');
      if (phone.length !== 10 || byPhone.has(phone)) continue;
      byPhone.set(phone, { name: name || phone, phone });
    }
  }
  return [...byPhone.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function matchContacts(phones: string[], workspaceId: string): Promise<Record<string, ContactMatch>> {
  const res = await fetch('/api/contacts/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phones, workspaceId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not check contacts');
  return data.matches ?? {};
}
