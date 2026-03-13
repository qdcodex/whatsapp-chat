import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Radio, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (!user) {
      toast.error('Invalid credentials');
      return;
    }
    toast.success(`Welcome back, ${user.displayName}!`);
    if (user.role === 'superadmin') navigate('/superadmin');
    else if (user.role === 'admin') navigate(`/admin/${user.workspaceId}`);
    else navigate(`/workspace/${user.adminId}`);
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

        <form onSubmit={handleLogin} className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8 space-y-4 sm:space-y-5">
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

          <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium">
            Sign In
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Default: superadmin / admin123
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
