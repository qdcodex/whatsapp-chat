import { useState, useRef } from 'react';
import { UserPlus, Upload, X, Plus, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface ContactEntry {
  name: string;
  phone: string;
}

interface ContactImporterProps {
  onImport: (contacts: ContactEntry[]) => void;
  triggerLabel?: string;
  triggerVariant?: 'icon' | 'button';
}

const ContactImporter = ({ onImport, triggerLabel = 'Invite Contacts', triggerVariant = 'icon' }: ContactImporterProps) => {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactEntry[]>([{ name: '', phone: '' }]);
  const [tab, setTab] = useState<'manual' | 'csv'>('manual');
  const fileRef = useRef<HTMLInputElement>(null);

  const addRow = () => setContacts([...contacts, { name: '', phone: '' }]);

  const updateContact = (i: number, field: 'name' | 'phone', value: string) => {
    const updated = [...contacts];
    updated[i] = { ...updated[i], [field]: value };
    setContacts(updated);
  };

  const removeRow = (i: number) => {
    if (contacts.length === 1) return;
    setContacts(contacts.filter((_, idx) => idx !== i));
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed: ContactEntry[] = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(/[,\t;]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          const name = cols[0];
          const phone = cols[1];
          if (name && phone && !/^name$/i.test(name)) {
            parsed.push({ name, phone });
          }
        }
      }

      if (parsed.length === 0) {
        toast.error('No valid contacts found. Use format: Name, Phone');
        return;
      }

      setContacts(parsed);
      setTab('manual');
      toast.success(`${parsed.length} contacts imported from CSV`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = () => {
    const valid = contacts.filter(c => c.name.trim() && c.phone.trim());
    if (valid.length === 0) {
      toast.error('Add at least one contact with name and phone');
      return;
    }
    onImport(valid);
    setContacts([{ name: '', phone: '' }]);
    setOpen(false);
    toast.success(`${valid.length} contact(s) invited!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" title={triggerLabel}>
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <UserPlus className="w-3.5 h-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invite Contacts
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex bg-secondary rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Entry
          </button>
          <button
            onClick={() => setTab('csv')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'csv' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import CSV
          </button>
        </div>

        {tab === 'csv' ? (
          <div className="space-y-3 py-2">
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Upload CSV or Text File</p>
              <p className="text-xs text-muted-foreground mb-3">Format: Name, Phone (one per line)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleCSV}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Choose File
              </Button>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs font-medium mb-1.5">Example CSV format:</p>
              <pre className="text-[11px] text-muted-foreground font-mono">
{`John Doe, +1234567890
Jane Smith, +0987654321`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 py-1 max-h-[40vh]">
            {contacts.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <Input
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => updateContact(i, 'name', e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="Phone"
                    value={c.phone}
                    onChange={(e) => updateContact(i, 'phone', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(i)}
                  disabled={contacts.length === 1}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addRow} className="w-full gap-1.5 text-xs text-primary">
              <Plus className="w-3.5 h-3.5" />
              Add Another Contact
            </Button>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <Button onClick={handleSubmit} className="w-full gap-1.5">
            <UserPlus className="w-4 h-4" />
            Invite {contacts.filter(c => c.name.trim() && c.phone.trim()).length || ''} Contact{contacts.filter(c => c.name.trim() && c.phone.trim()).length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactImporter;
