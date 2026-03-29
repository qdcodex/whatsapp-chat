import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Radio, Lock, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [mode, setMode] = useState<'credentials' | 'phone'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const login = useAuthStore((s) => s.login);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);
  const currentUser = useAuthStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'superadmin') navigate('/superadmin', { replace: true });
      else if (currentUser.role === 'admin') navigate(`/admin/${currentUser.workspaceId}`, { replace: true });
      else navigate(`/workspace/${currentUser.adminId}`, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let user;
    if (mode === 'phone') {
      if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
      user = loginByPhone(phone.trim());
      if (!user) { toast.error('No account found with this phone number'); return; }
    } else {
      user = login(username, password);
      if (!user) { toast.error('Invalid credentials'); return; }
    }
    toast.success(`Welcome back, ${user.displayName}!`);
    if (user.role === 'superadmin') navigate('/superadmin', { replace: true });
    else if (user.role === 'admin') navigate(`/admin/${user.workspaceId}`, { replace: true });
    else navigate(`/workspace/${user.adminId}`, { replace: true });
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
              onClick={() => setMode('credentials')}
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

          <form onSubmit={handleLogin} className="space-y-4">
            {mode === 'credentials' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="pl-10 h-11"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Use the phone number you provided when joining a group.</p>
              </div>
            )}

            <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium">
              Sign In
            </Button>
          </form>

          {mode === 'credentials' && (
            <p className="text-xs text-center text-muted-foreground">
              Default: superadmin / admin123
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
