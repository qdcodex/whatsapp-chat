'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { uploadImage } from '@/lib/uploadImage';
import { toast } from 'sonner';

interface SetupProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SetupProfileModal({ open, onClose }: SetupProfileModalProps) {
  const { currentUser, updateUser, updateAvatar } = useAuthStore();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar || null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setAvatarPreview(canvas.toDataURL('image/jpeg', 0.8));
      canvas.toBlob((blob) => setAvatarBlob(blob), 'image/jpeg', 0.8);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!currentUser) return;
    setSaving(true);
    try {
      if (avatarBlob) {
        const uploadToastId = toast.loading('Uploading photo…');
        try {
          const url = await uploadImage(avatarBlob, 'avatars');
          await updateAvatar(currentUser.id, url);
          toast.dismiss(uploadToastId);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Photo upload failed', { id: uploadToastId });
          setSaving(false);
          return;
        }
      }
      await updateUser(currentUser.id, { displayName: name.trim() });
      toast.success('Profile saved!');
      onClose();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim()
    ? name.trim().charAt(0).toUpperCase()
    : currentUser?.displayName?.charAt(0).toUpperCase() || '?';

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Set Up Your Profile</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Choose a name your contacts will see
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 pt-2 pb-1">
          {/* Avatar picker */}
          <div className="relative">
            <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileRef.current?.click()}>
              <AvatarImage src={avatarPreview || undefined} alt={name} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow"
            >
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>

          {/* Name input */}
          <div className="w-full space-y-1.5">
            <Label htmlFor="setupName">Your Name</Label>
            <Input
              id="setupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && !saving && handleSave()}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              This name is visible to other members of your workspace.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Later
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
