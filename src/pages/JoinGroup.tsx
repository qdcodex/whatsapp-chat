import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/stores/groupStore';
import { useAuthStore } from '@/stores/authStore';
import { Radio, Users, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

const OTP_CODE = '1234';

const JoinGroup = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const navigate = useNavigate();
  const { getGroupBySlug, addMember } = useGroupStore();
  const { createUser } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');

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

  if (step === 'done') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">You're In!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            You've joined <span className="font-semibold text-foreground">{group.name}</span>. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    setStep('otp');
    toast.success('OTP sent! (Demo: use 1234)');
  };

  const handleOtpVerify = () => {
    if (otp !== OTP_CODE) { toast.error('Invalid OTP. Try 1234'); return; }

    const username = name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    const password = Math.random().toString(36).substring(2, 10);

    const newUser = createUser({
      username,
      password,
      displayName: name.trim(),
      phone: phone.trim(),
      role: 'user',
      adminId: group.adminId,
      workspaceId: group.workspaceId,
    });

    addMember(group.id, newUser.id);
    useAuthStore.getState().login(username, password);

    setStep('done');
    toast.success(`Welcome to ${group.name}!`);

    setTimeout(() => {
      navigate(`/workspace/${group.adminId}`);
    }, 1500);
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

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 space-y-4">
          {step === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" type="tel" required />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium gap-2">
                <Send className="w-4 h-4" /> Join Group
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setStep('form'); setOtp(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Enter verification code</p>
                <p className="text-xs text-muted-foreground">Code sent to {phone}</p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleOtpVerify} disabled={otp.length < 4} className="w-full rounded-xl h-11 text-base font-medium">
                Verify & Join
              </Button>
              <p className="text-xs text-center text-muted-foreground">Demo OTP: <span className="font-mono font-semibold text-foreground">1234</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinGroup;
