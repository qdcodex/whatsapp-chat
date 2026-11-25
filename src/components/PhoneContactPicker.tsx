import { useMemo, useState } from 'react';
import { Search, Smartphone, UserCheck, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { readPhoneContacts, matchContacts, type PhoneContact, type ContactMatch } from '@/lib/phoneContacts';

interface PhoneContactPickerProps {
  // Creates the user; resolve when done, throw to show an error
  onAdd: (contact: PhoneContact) => Promise<void>;
}

// Admin "Add user" from the phone's address book (installed app only).
// Contacts already in this workspace are marked; the rest get an Add button.
const PhoneContactPicker = ({ onAdd }: PhoneContactPickerProps) => {
  const [contacts, setContacts] = useState<PhoneContact[] | null>(null);
  const [matches, setMatches] = useState<Record<string, ContactMatch>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const loadContacts = async () => {
    setLoading(true);
    try {
      const list = await readPhoneContacts();
      setMatches(await matchContacts(list.map((c) => c.phone)));
      setContacts(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read contacts');
    } finally {
      setLoading(false);
    }
  };

  // People not yet added first, then those already in the workspace
  const visible = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    const list = q ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : contacts;
    const isUser = (c: PhoneContact) => !!matches[c.phone] || added.has(c.phone);
    return [...list].sort((a, b) => Number(isUser(a)) - Number(isUser(b)));
  }, [contacts, matches, added, query]);

  const handleAdd = async (c: PhoneContact) => {
    setAdding(c.phone);
    try {
      await onAdd(c);
      setAdded((prev) => new Set(prev).add(c.phone));
      toast.success(`${c.name} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add user');
    } finally {
      setAdding(null);
    }
  };

  if (!contacts) {
    return (
      <div className="py-4 text-center space-y-3">
        <Smartphone className="w-9 h-9 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Pick people from your phone's contacts to add them as users.</p>
        <Button onClick={loadContacts} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          {loading ? 'Reading contacts…' : 'Load phone contacts'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" className="h-9 pl-8 text-sm" />
      </div>
      <div className="overflow-y-auto max-h-[50vh] -mx-1 px-1 space-y-0.5">
        {visible.map((c) => {
          const isUser = !!matches[c.phone] || added.has(c.phone);
          return (
            <div key={c.phone} className="flex items-center gap-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.phone}</p>
              </div>
              {isUser ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <UserCheck className="w-3.5 h-3.5" /> Added
                </span>
              ) : (
                <Button size="sm" className="h-7 text-xs gap-1 shrink-0" disabled={adding !== null} onClick={() => handleAdd(c)}>
                  {adding === c.phone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Add
                </Button>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">No contacts found</p>}
      </div>
    </div>
  );
};

export default PhoneContactPicker;
