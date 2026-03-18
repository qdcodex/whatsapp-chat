import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGroupStore } from '@/stores/groupStore';
import { Radio, Users, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const JoinGroup = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { getGroupBySlug, submitJoinRequest, getJoinRequests } = useGroupStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const group = getGroupBySlug(groupSlug || '');

  if (!group) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Group Not Found</h1>
          <p className="text-sm text-muted-foreground mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Request Sent!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your request to join <span className="font-semibold text-foreground">{group.name}</span> has been submitted. The admin will review it shortly.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitJoinRequest({
      groupId: group.id,
      name,
      phone: phone || undefined,
      message: message || undefined,
    });
    setSubmitted(true);
    toast.success('Join request submitted!');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1.5 text-sm">{group.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{group.memberIds.length} members</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 space-y-4">
          <div className="space-y-2">
            <Label>Your Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required />
          </div>
          <div className="space-y-2">
            <Label>Phone Number (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" type="tel" />
          </div>
          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why do you want to join?" />
          </div>
          <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium gap-2">
            <Send className="w-4 h-4" /> Request to Join
          </Button>
        </form>
      </div>
    </div>
  );
};

export default JoinGroup;
