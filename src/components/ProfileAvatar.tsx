import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  userId: string;
  displayName: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
};

const textClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
};

const ProfileAvatar = ({
  userId,
  displayName,
  avatar,
  size = 'md',
  editable = false,
  showOnlineStatus = false,
  isOnline = false,
  className,
}: ProfileAvatarProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { updateAvatar } = useAuthStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateAvatar(userId, result);
      toast.success('Profile picture updated!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className={cn(sizeClasses[size], editable && 'cursor-pointer')} onClick={() => editable && fileRef.current?.click()}>
        <AvatarImage src={avatar} alt={displayName} />
        <AvatarFallback className={cn('bg-accent text-accent-foreground font-semibold', textClasses[size])}>
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card"
          >
            <Camera className="w-2.5 h-2.5 text-primary-foreground" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </>
      )}
      {showOnlineStatus && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isOnline ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
      )}
    </div>
  );
};

export default ProfileAvatar;
