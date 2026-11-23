"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Radio, Users, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { requestOtp } from '@/lib/otpClient';

interface PublicGroup { name: string; description?: string; memberCount: number }

const JoinGroup = () => {
  const { groupSlug } = useParams() as { groupSlug: string };
  const joinGroup = useAuthStore((s) => s.joinGroup);
  const [group, setGroup] = useState<PublicGroup | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpDevMode, setOtpDevMode] = useState(false);

  // Visitors aren't logged in, so only the group's public info is loaded
  useEffect(() => {
    fetch(`/api/public/groups/${encodeURIComponent(groupSlug || '')}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [groupSlug]);

  if (group === undefined) {
    return <div className="min-h-[100dvh] bg-background" />;
  }

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
          <h1 className="text-xl font-bold text-foreground">You&apos;re In!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;ve joined <span className="font-semibold text-foreground">{group.name}</span>. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    setOtpBusy(true);
    try {
      const { devMode } = await requestOtp(phone, 'join');
      setOtpDevMode(devMode);
      setStep('otp');
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setOtpBusy(false);
    }
  };

  // The server verifies the code, creates or reuses the account, adds it to the group and logs in
  const handleOtpVerify = async () => {
    setOtpBusy(true);
    try {
      const user = await joinGroup({ groupSlug, name: name.trim(), phone, otp });
      setStep('done');
      toast.success(`Welcome to ${group.name}!`);
      setTimeout(() => window.location.assign(`/workspace/${user.adminId}`), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join the group');
      setOtpBusy(false);
    }
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
          <p className="text-xs text-muted-foreground mt-2">{group.memberCount} members</p>
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
              <Button type="submit" disabled={otpBusy} className="w-full rounded-xl h-11 text-base font-medium gap-2">
                <Send className="w-4 h-4" /> {otpBusy ? 'Sending code…' : 'Join Group'}
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
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleOtpVerify} disabled={otp.length < 6 || otpBusy} className="w-full rounded-xl h-11 text-base font-medium">
                {otpBusy ? 'Verifying…' : 'Verify & Join'}
              </Button>
              {otpDevMode && (
                <p className="text-xs text-center text-muted-foreground">Dev mode (no SMS configured): use <span className="font-mono font-semibold text-foreground">123456</span></p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinGroup;
