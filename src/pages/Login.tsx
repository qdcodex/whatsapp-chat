import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Radio, Lock, User, Phone, ArrowLeft } from 'lucide-react';
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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const login = useAuthStore((s) => s.login);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'superadmin') navigate('/superadmin', { replace: true });
      else if (currentUser.role === 'admin') navigate(`/admin/${currentUser.workspaceId}`, { replace: true });
      else navigate(`/workspace/${currentUser.adminId}`, { replace: true });
    }
  }, [currentUser, navigate]);

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
    if (user.role === 'superadmin') navigate('/superadmin', { replace: true });
    else if (user.role === 'admin') navigate(`/admin/${user.workspaceId}`, { replace: true });
    else navigate(`/workspace/${user.adminId}`, { replace: true });
  };

  const resetPhoneFlow = () => {
    setOtpStep('phone');
    setOtp('');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
            <Radio className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">BroadcastHub</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">Real-time broadcast messaging</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 space-y-4 sm:space-y-5">
          {/* Toggle between login modes */}
          <div className="flex rounded-xl bg-secondary p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('credentials'); resetPhoneFlow(); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'credentials' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Username
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'phone' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Phone Number
            </button>
          </div>

          {mode === 'credentials' ? (
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className="pl-10 h-11" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="pl-10 h-11" required />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium">Sign In</Button>
              <p className="text-xs text-center text-muted-foreground">Default: superadmin / admin123</p>
            </form>
          ) : otpStep === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="pl-10 h-11" required />
                </div>
                <p className="text-xs text-muted-foreground">Use the phone number you provided when joining a group.</p>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium">Send OTP</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <button onClick={resetPhoneFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Change number
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
