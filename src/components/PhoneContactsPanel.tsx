import { useMemo, useState } from 'react';
import { Search, Smartphone, UserCheck, UserPlus, MessageCircle, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { readPhoneContacts, matchContacts, type PhoneContact, type ContactMatch } from '@/lib/phoneContacts';
import { toIndianInternational } from '@/lib/phone';

export interface PhoneContactsOptions {
  workspaceId: string;
  groupName: string;
  joinLink: string;
  memberIds: string[];
  onAddUser: (userId: string) => void;
}

const PhoneContactsPanel = ({ workspaceId, groupName, joinLink, memberIds, onAddUser }: PhoneContactsOptions) => {
  const [contacts, setContacts] = useState<PhoneContact[] | null>(null);
  const [matches, setMatches] = useState<Record<string, ContactMatch>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  const inviteText = `Join "${groupName}" on ME2 App: ${joinLink}`;

  const loadContacts = async () => {
    setLoading(true);
    try {
      const list = await readPhoneContacts();
      const found = await matchContacts(list.map((c) => c.phone));
      setContacts(list);
      setMatches(found);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read contacts');
    } finally {
      setLoading(false);
    }
  };

  // Contacts already on the app first, then everyone else
  const visible = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      : contacts;
    return [...filtered].sort((a, b) => Number(!!matches[b.phone]) - Number(!!matches[a.phone]));
  }, [contacts, matches, query]);

  const onAppCount = contacts ? contacts.filter((c) => matches[c.phone]).length : 0;

  const handleAdd = (userId: string) => {
    onAddUser(userId);
    setAdded((prev) => new Set(prev).add(userId));
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${toIndianInternational(phone)}?text=${encodeURIComponent(inviteText)}`, '_blank');
  };

  const openSms = (phone: string) => {
    window.location.href = `sms:+${toIndianInternational(phone)}?body=${encodeURIComponent(inviteText)}`;
  };

  if (!contacts) {
    return (
      <div className="py-6 text-center space-y-3">
        <Smartphone className="w-10 h-10 mx-auto text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Import from your phone</p>
          <p className="text-xs text-muted-foreground mt-1">
            See which contacts already use the app, add them to this group, or invite the rest.
          </p>
        </div>
        <Button onClick={loadContacts} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          {loading ? 'Reading contacts…' : 'Load phone contacts'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <p className="text-xs text-muted-foreground">
        {contacts.length} contacts · <span className="text-primary font-medium">{onAppCount} on the app</span>
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" className="h-9 pl-8 text-sm" />
      </div>
      <div className="overflow-y-auto max-h-[45vh] -mx-1 px-1 space-y-0.5">
        {visible.map((c) => {
          const match = matches[c.phone];
          const inGroup = match && (memberIds.includes(match.userId) || added.has(match.userId));
          return (
            <div key={c.phone} className="flex items-center gap-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.phone}
                  {match && <span className="text-primary font-medium"> · On app</span>}
                </p>
              </div>
              {match ? (
                inGroup ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <UserCheck className="w-3.5 h-3.5" /> In group
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => handleAdd(match.userId)}>
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </Button>
                )
              ) : (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => openWhatsApp(c.phone)} title="Invite on WhatsApp">
                    <MessageCircle className="w-3.5 h-3.5" /> Invite
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSms(c.phone)} title="Invite by SMS">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">No contacts found</p>}
      </div>
    </div>
  );
};

export default PhoneContactsPanel;
