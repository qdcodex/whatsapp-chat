'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSocket } from '@/hooks/useSocket';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const pathname = usePathname();

  // Derive workspaceId from the current URL:
  //   /workspace/[adminId]  → look up workspace by admin
  //   /admin/[workspaceId]  → workspaceId is in the URL directly
  const workspaceId = useWorkspaceStore((s) => {
    const parts = pathname?.split('/').filter(Boolean) ?? [];
    if (parts[0] === 'workspace' && parts[1]) {
      return s.getWorkspaceByAdmin(parts[1])?.id ?? '';
    }
    if (parts[0] === 'admin' && parts[1]) {
      return parts[1]; // already the workspaceId
    }
    return '';
  });

  useSocket({
    userId: userId || '',
    workspaceId: workspaceId || '',
  });

  return <>{children}</>;
}
