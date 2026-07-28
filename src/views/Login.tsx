"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

const OTP_CODE = '1234';

const Login = () => {
  const [mode, setMode] = useState<'credentials' | 'phone'>('credentials');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const login = useAuthStore((s) => s.login);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'superadmin') router.replace('/superadmin');
      else if (currentUser.role === 'admin') router.replace(`/admin/${currentUser.workspaceId}`);
      else router.replace(`/workspace/${currentUser.adminId}`);
    }
  }, [currentUser, router]);

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (!user) { toast.error('Invalid credentials'); return; }
    toast.success(`Welcome back, ${user.displayName}!`);
    redirectUser(user);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    const exists = users.some((u) => u.phone && u.phone === phone.trim());
    if (!exists) { toast.error('No account found with this phone number'); return; }
    setOtpStep('otp');
    toast.success('OTP sent! (Demo: use 1234)');
  };

  const handleOtpVerify = () => {
    if (otp !== OTP_CODE) { toast.error('Invalid OTP. Try 1234'); return; }
    const user = loginByPhone(phone.trim());
    if (!user) { toast.error('Login failed'); return; }
    toast.success(`Welcome back, ${user.displayName}!`);
    redirectUser(user);
  };

  const redirectUser = (user: { role: string; workspaceId?: string; adminId?: string }) => {
    if (user.role === 'superadmin') router.replace('/superadmin');
    else if (user.role === 'admin') router.replace(`/admin/${user.workspaceId}`);
    else router.replace(`/workspace/${user.adminId}`);
  };

  const resetPhoneFlow = () => {
    setOtpStep('phone');
    setOtp('');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-wa-header">
      {/* Top decorative area */}
      <div className="h-52 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full overflow-hidden mb-4">
            <img src="/logo.png" alt="BroadcastHub" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-wa-header-fg">ChatApp</h1>
          <p className="text-wa-header-fg/60 mt-1 text-sm">Simple. Reliable. Private.</p>
        </div>
      </div>

      {/* Login card */}
      <div className="flex-1 bg-background rounded-t-3xl -mt-4 px-4 pt-8 pb-8">
        <div className="w-full max-w-sm mx-auto space-y-5">
          {/* Toggle */}
          <div className="flex rounded-lg bg-secondary p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('credentials'); resetPhoneFlow(); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${mode === 'credentials' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Username
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${mode === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Phone Number
            </button>
          </div>

          {mode === 'credentials' ? (
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className="pl-10 h-12 rounded-lg" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-10 h-12 rounded-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-lg h-12 text-base font-medium bg-primary hover:bg-primary/90">Sign In</Button>
            </form>
          ) : otpStep === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="pl-10 h-12 rounded-lg" required />
                </div>
                <p className="text-xs text-muted-foreground">Use the phone number you provided when joining a group.</p>
              </div>
              <Button type="submit" className="w-full rounded-lg h-12 text-base font-medium bg-primary hover:bg-primary/90">Send OTP</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <button onClick={resetPhoneFlow} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> Change number
              </button>
              <div className="text-center space-y-1.5">
                <p className="text-base font-semibold text-foreground">Enter verification code</p>
                <p className="text-sm text-muted-foreground">Code sent to <span className="font-medium text-foreground">{phone}</span></p>
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
              <Button onClick={handleOtpVerify} disabled={otp.length < 4} className="w-full rounded-lg h-12 text-base font-medium bg-primary hover:bg-primary/90">
                Verify & Sign In
              </Button>
              <p className="text-xs text-center text-muted-foreground">Demo OTP: <span className="font-mono font-semibold text-foreground">1234</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
