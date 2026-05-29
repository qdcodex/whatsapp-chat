"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { format } from 'date-fns';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGroupStore } from '@/stores/groupStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { socketClient } from '@/lib/socketClient';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import TypingIndicator from '@/components/TypingIndicator';
import OnlineStatus from '@/components/OnlineStatus';
import { LogOut, Users, ArrowLeft, Search, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ProfileAvatar from '@/components/ProfileAvatar';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import UnreadBadge from '@/components/UnreadBadge';
import ContactImporter, { type ContactEntry } from '@/components/ContactImporter';
import AdBanner from '@/components/AdBanner';
import SetupProfileModal from '@/components/SetupProfileModal';
import { toast } from 'sonner';
import type { ChatView } from '@/types';

const UserDashboard = () => {
  const router = useRouter();
  const { currentUser, logout, getUserById, getUserByPhone, getMaskedPhone, createUser, getUsersByAdmin, updateUser } = useAuthStore();
  const { getDMMessages, getGroupMessages, sendMessage, deleteMessage, markAsRead, getUnreadDMCount, getUnreadGroupCount } = useMessageStore();
  const { getWorkspaceByAdmin } = useWorkspaceStore();
  const { getUserGroups, isMemberMuted, addMember } = useGroupStore();
  const [chatView, setChatView] = useState<ChatView>({ type: 'dm', userId: '' });
  const [showSidebar, setShowSidebar] = useState(true);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ message: import('@/types').Message; senderName: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(currentUser?.displayName || '');
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Derive workspace slug early (needed for hooks below)
  const _workspace = currentUser ? getWorkspaceByAdmin(currentUser.adminId!) : null;
  const _slug = _workspace?.slug || '';

  // Socket-based real-time presence — must be called unconditionally (Rules of Hooks)
  const { isUserOnline, isDMUserTyping, isGroupTyping, getGroupTypingUsers } = useOnlineStatus({
    userId: currentUser?.id || '',
    workspaceId: _slug,
    enabled: !!_slug && !!currentUser,
  });

  const handleUpdateDisplayName = async () => {
    if (!editingDisplayName.trim()) { toast.error('Display name cannot be empty'); return; }
    if (editingDisplayName === currentUser?.displayName) { toast.success('No changes made'); return; }
    try {
      await updateUser(currentUser!.id, { displayName: editingDisplayName.trim() });
      toast.success('Display name updated');
      setSettingsOpen(false);
    } catch (error) {
      toast.error('Failed to update display name');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !_slug) return;

    const messageCleanup = useMessageStore.getState().initializeRealTime(currentUser.id, _slug);
    const presenceCleanup = usePresenceStore.getState().initializeRealTime(currentUser.id, _slug);

    return () => {
      messageCleanup?.();
      presenceCleanup?.();
    };
  }, [currentUser?.id, _slug]);

  useEffect(() => {
    if (!currentUser) return;
    let unread: import('@/types').Message[] = [];
    if (typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId) {
      const msgs = getDMMessages(_slug, currentUser.id, chatView.userId);
      unread = msgs.filter(m => m.senderId !== currentUser.id && m.status !== 'read');
    } else if (typeof chatView === 'object' && chatView.type === 'group') {
      const msgs = getGroupMessages((chatView as { type: 'group'; groupId: string }).groupId);
      unread = msgs.filter(m => m.senderId !== currentUser.id && m.status !== 'read');
    }
    if (unread.length > 0) markAsRead(unread.map(m => m.id));
  }, [chatView, currentUser, _slug]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'user') {
      router.replace('/');
    }
  }, [currentUser, router]);

  // Show profile setup modal when user's name is still the admin-assigned default
  // (displayName equals their phone number or username)
  useEffect(() => {
    if (!currentUser) return;
    const looksLikePhone = (s: string) => /^[+\d\s\-().]{6,}$/.test(s.trim());
    const isDefaultName =
      currentUser.displayName === currentUser.username ||
      currentUser.displayName === currentUser.phone ||
      looksLikePhone(currentUser.displayName);
    const dismissed = typeof window !== 'undefined'
      ? localStorage.getItem(`profile-setup-dismissed-${currentUser.id}`)
      : null;
    if (isDefaultName && !dismissed) {
      setShowProfileSetup(true);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.adminId) {
      setChatView((prev) => {
        if (typeof prev === 'object' && prev.type === 'dm' && prev.userId === '') {
          return { type: 'dm', userId: currentUser.adminId! };
        }
        return prev;
      });
    }
  }, [currentUser?.adminId]);


  if (!currentUser || currentUser.role !== 'user') return null;

  const workspace = getWorkspaceByAdmin(currentUser.adminId!);
  const slug = workspace?.slug || '';
  const groups = getUserGroups(currentUser.id);

  const admin = getUserById(currentUser.adminId!);
  const peerContacts = getUsersByAdmin(currentUser.adminId!).filter(
    (u) => u.id !== currentUser.id
  );

  const dmTargetId = isDMChatView(chatView) ? chatView.userId : '';
  const dmTarget = dmTargetId ? getUserById(dmTargetId) : null;

  function isDMChatView(cv: ChatView): cv is { type: 'dm'; userId: string } {
    return typeof cv === 'object' && cv.type === 'dm';
  }

  const getActiveMessages = () => {
    if (isDMChatView(chatView) && chatView.userId) {
      return getDMMessages(slug, currentUser.id, chatView.userId);
    }
    if (typeof chatView === 'object' && chatView.type === 'group') {
      return getGroupMessages(chatView.groupId);
    }
    return [];
  };

  const activeMessages = getActiveMessages();
  const isDMChat = isDMChatView(chatView);
  const isGroupChat = typeof chatView === 'object' && chatView.type === 'group';
  const activeGroup = isGroupChat ? groups.find(g => g.id === (chatView as { type: 'group'; groupId: string }).groupId) : null;

  // Use socket-based presence (works across different devices/users)
  const dmTargetOnline = dmTargetId ? isUserOnline(dmTargetId) : false;
  const dmTargetTyping = dmTargetId ? isDMUserTyping(dmTargetId) : false;
  const activeGroupId = isGroupChat ? (chatView as { type: 'group'; groupId: string }).groupId : null;
  const groupTyping = activeGroupId ? isGroupTyping(activeGroupId) : false;
  const groupTypingUserIds = activeGroupId ? getGroupTypingUsers(activeGroupId) : [];

  const isChatEnabled = (() => {
    if (currentUser.chatEnabled !== undefined) return currentUser.chatEnabled;
    return workspace?.globalChatEnabled ?? false;
  })();

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
    const replyData = replyingTo ? {
      replyTo: {
        messageId: replyingTo.message.id,
        text: replyingTo.message.text,
        senderName: replyingTo.senderName,
      },
    } : {};

    if (isGroupChat && activeGroup) {
      sendMessage({
        adminId: activeGroup.adminId,
        workspaceId: slug,
        senderId: currentUser.id,
        groupId: activeGroup.id,
        text, imageUrl, audioUrl, audioDuration,
        ...replyData,
      });
    } else if (isDMChat && dmTargetId) {
      sendMessage({
        adminId: currentUser.adminId!,
        workspaceId: slug,
        senderId: currentUser.id,
        recipientId: dmTargetId,
        text, imageUrl, audioUrl, audioDuration,
        ...replyData,
      });
    }
    setReplyingTo(null);
  };

  const handleDelete = (msg: import('@/types').Message, mode: 'for_me' | 'for_everyone') => {
    // Only allow "delete for everyone" if this user sent the message
    if (mode === 'for_everyone' && msg.senderId !== currentUser.id) {
      toast.error("You can only delete your own messages for everyone");
      return;
    }
    deleteMessage(msg.id, currentUser.id, mode);
    toast.success(
      mode === 'for_everyone' ? 'Message deleted for everyone' : 'Message deleted'
    );
  };

  const handleTyping = () => {
    // Emit typing event via socket so OTHER users actually see the indicator
    if (isDMChat && dmTargetId) {
      socketClient.setTypingWithDebounce(dmTargetId, undefined);
    } else if (isGroupChat && activeGroupId) {
      socketClient.setTypingWithDebounce(undefined, activeGroupId);
    }
  };

  const handleInviteContacts = async (groupId: string, contacts: ContactEntry[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    for (const c of contacts) {
      const phone = c.phone.trim();
      if (!phone) continue;
      const existing = getUserByPhone(phone);
      if (existing) {
        addMember(groupId, existing.id);
      } else {
        try {
          const newUser = await createUser({
            username: phone,
            password: Math.random().toString(36).slice(2, 10),
            role: 'user',
            displayName: c.name.trim() || phone,
            phone,
            workspaceId: slug,
            adminId: currentUser.adminId!,
          });
          addMember(groupId, newUser.id);
        } catch (err: any) {
          toast.error(err?.message || `Failed to add ${c.name || phone}`);
        }
      }
    }
  };

  return (
    <div className="h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[340px] lg:w-[400px] border-r border-border bg-card shrink-0`}>
        {/* WhatsApp header */}
        <div className="h-14 px-4 flex items-center justify-between bg-wa-header shrink-0">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              userId={currentUser.id}
              displayName={currentUser.displayName}
              avatar={currentUser.avatar}
              size="sm"
              editable
            />
            <h1 className="font-semibold text-[15px] text-wa-header-fg truncate">{workspace?.name || 'Messages'}</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg">
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Edit Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="editDisplayName" className="text-sm font-medium">Display Name</Label>
                    <Input
                      id="editDisplayName"
                      type="text"
                      value={editingDisplayName}
                      onChange={(e) => setEditingDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="h-10"
                    />
                    <Button onClick={handleUpdateDisplayName} className="w-full" size="sm">Save Display Name</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg" onClick={() => { logout(); router.push('/'); }}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-2.5 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2 bg-wa-sidebar-header rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Admin DM */}
          {(() => {
            const dmMsgs = getDMMessages(slug, currentUser.id, currentUser.adminId!);
            const lastMsg = dmMsgs[dmMsgs.length - 1];
            const dmUnread = getUnreadDMCount(slug, currentUser.id, currentUser.adminId!);
            return (
              <button
                onClick={() => { setChatView({ type: 'dm', userId: currentUser.adminId! }); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30 ${isDMChat && dmTargetId === currentUser.adminId ? 'bg-secondary' : ''}`}
              >
                <ProfileAvatar
                  userId={currentUser.adminId!}
                  displayName={admin?.displayName || 'Admin'}
                  avatar={admin?.avatar}
                  size="md"
                  showOnlineStatus
                  isOnline={isUserOnline(currentUser.adminId!)}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[15px] text-foreground truncate">{admin?.displayName || 'Admin'}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lastMsg && (
                        <span className={`text-[11px] ${dmUnread > 0 ? 'text-wa-unread font-medium' : 'text-muted-foreground'}`}>
                          {format(new Date(lastMsg.timestamp), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[13px] text-muted-foreground truncate">
                      {lastMsg
                        ? lastMsg.audioUrl ? '🎤 Voice message'
                          : lastMsg.imageUrl ? '📷 Photo'
                          : lastMsg.text || 'Tap to chat'
                        : 'Tap to chat'}
                    </p>
                    <UnreadBadge count={dmUnread} />
                  </div>
                </div>
              </button>
            );
          })()}

          {/* Groups */}
          {groups.length > 0 && (
            <div className="px-4 py-2.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Groups</p>
            </div>
          )}
          {groups.map((group) => {
            const isActive = typeof chatView === 'object' && chatView.type === 'group' && chatView.groupId === group.id;
            const groupMsgs = getGroupMessages(group.id);
            const lastMsg = groupMsgs[groupMsgs.length - 1];
            const lastSender = lastMsg ? getUserById(lastMsg.senderId) : null;
            return (
              <div
                key={group.id}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30 cursor-pointer ${isActive ? 'bg-secondary' : ''}`}
                onClick={() => { setChatView({ type: 'group', groupId: group.id }); setShowSidebar(false); }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[15px] text-foreground truncate">{group.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lastMsg && (
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(lastMsg.timestamp), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[13px] text-muted-foreground truncate">
                      {lastMsg
                        ? `${lastMsg.senderId === currentUser.id ? 'You' : (lastSender?.displayName || 'Unknown')}: ${
                            lastMsg.audioUrl ? '🎤 Voice message'
                              : lastMsg.imageUrl ? '📷 Photo'
                              : lastMsg.text || ''
                          }`
                        : `${group.memberIds.length} members`}
                    </p>
                    <UnreadBadge count={getUnreadGroupCount(group.id, currentUser.id)} />
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <ContactImporter
                    triggerLabel="Invite"
                    onImport={(contacts) => handleInviteContacts(group.id, contacts)}
                  />
                </div>
              </div>
            );
          })}

          {/* Contacts */}
          {peerContacts.length > 0 && (
            <div className="px-4 py-2.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Contacts</p>
            </div>
          )}
          {peerContacts.map((contact) => {
            const isActive = isDMChat && dmTargetId === contact.id;
            const contactDmMsgs = getDMMessages(slug, currentUser.id, contact.id);
            const lastMsg = contactDmMsgs[contactDmMsgs.length - 1];
            const contactUnread = getUnreadDMCount(slug, currentUser.id, contact.id);
            const contactOnline = isUserOnline(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => { setChatView({ type: 'dm', userId: contact.id }); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30 ${isActive ? 'bg-secondary' : ''}`}
              >
                <ProfileAvatar
                  userId={contact.id}
                  displayName={contact.displayName || contact.username}
                  avatar={contact.avatar}
                  size="md"
                  showOnlineStatus
                  isOnline={contactOnline}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[15px] text-foreground truncate">{contact.displayName || contact.username}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lastMsg && (
                        <span className={`text-[11px] ${contactUnread > 0 ? 'text-wa-unread font-medium' : 'text-muted-foreground'}`}>
                          {format(new Date(lastMsg.timestamp), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[13px] text-muted-foreground truncate">
                      {lastMsg
                        ? lastMsg.audioUrl ? '🎤 Voice message'
                          : lastMsg.imageUrl ? '📷 Photo'
                          : lastMsg.text || 'Tap to chat'
                        : 'Tap to chat'}
                    </p>
                    <UnreadBadge count={contactUnread} />
                  </div>
                </div>
              </button>
            );
          })}

          {/* Sidebar ad — full-bleed hero card when image is set */}
          {workspace?.adEnabled && (
            workspace.adImageUrl ? (
              <div className="px-3 pt-3 pb-5">
                {workspace.adLinkUrl ? (
                  <a
                    href={workspace.adLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative rounded-2xl overflow-hidden shadow-md active:opacity-90 transition-opacity"
                  >
                    <img
                      src={workspace.adImageUrl}
                      alt={workspace.adTitle || 'Sponsored'}
                      className="w-full h-44 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="absolute top-2.5 right-2.5 bg-black/55 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Sponsored
                    </span>
                    {(workspace.adTitle || workspace.adText) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-12 pb-3.5 px-3.5">
                        {workspace.adTitle && (
                          <p className="text-white font-bold text-[15px] leading-tight">{workspace.adTitle}</p>
                        )}
                        {workspace.adText && (
                          <p className="text-white/75 text-xs mt-0.5 line-clamp-2">{workspace.adText}</p>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/70 mt-1.5">
                          Tap to learn more <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                  </a>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden shadow-md">
                    <img
                      src={workspace.adImageUrl}
                      alt={workspace.adTitle || 'Sponsored'}
                      className="w-full h-44 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="absolute top-2.5 right-2.5 bg-black/55 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Sponsored
                    </span>
                    {(workspace.adTitle || workspace.adText) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-12 pb-3.5 px-3.5">
                        {workspace.adTitle && (
                          <p className="text-white font-bold text-[15px] leading-tight">{workspace.adTitle}</p>
                        )}
                        {workspace.adText && (
                          <p className="text-white/75 text-xs mt-0.5 line-clamp-2">{workspace.adText}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (workspace.adTitle || workspace.adText) ? (
              /* Fallback — text-only strip when no image uploaded */
              <AdBanner
                title={workspace.adTitle}
                text={workspace.adText}
                linkUrl={workspace.adLinkUrl}
                variant="compact"
              />
            ) : null
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {/* WhatsApp header */}
        <div className="h-14 px-3 flex items-center justify-between bg-wa-header shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden shrink-0 text-wa-header-fg/80 hover:bg-wa-teal-dark"
              onClick={() => setShowSidebar(true)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isDMChat && dmTarget ? (
              <>
                <ProfileAvatar
                  userId={dmTargetId}
                  displayName={dmTarget.displayName || 'User'}
                  avatar={dmTarget.avatar}
                  size="sm"
                  showOnlineStatus
                  isOnline={dmTargetOnline}
                />
                <div className="min-w-0">
                  <p className="font-medium text-[15px] text-wa-header-fg truncate">{dmTarget.displayName || 'User'}</p>
                  <OnlineStatus isOnline={dmTargetOnline} size="sm" />
                </div>
              </>
            ) : activeGroup ? (
              <button
                onClick={() => setGroupInfoOpen(true)}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-wa-header-fg" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium text-[15px] text-wa-header-fg truncate">{activeGroup.name}</p>
                  <p className="text-[12px] text-wa-header-fg/60">{activeGroup.memberIds.length} members · tap for info</p>
                </div>
              </button>
            ) : null}
          </div>
        </div>

        {/* Empty state — full-bleed ad or placeholder when no chat is selected */}
        {!dmTarget && !activeGroup && (
          workspace?.adEnabled && workspace.adImageUrl ? (
            /* Full-bleed hero — image covers the entire empty panel */
            <div className="hidden md:block relative flex-1 overflow-hidden bg-black">
              <img
                src={workspace.adImageUrl}
                alt={workspace.adTitle || 'Sponsored'}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />

              {/* "Sponsored" chip — top-right */}
              <span className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider">
                Sponsored
              </span>

              {/* Gradient + text — bottom */}
              {(workspace.adTitle || workspace.adText || workspace.adLinkUrl) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-20 pb-8 px-8">
                  {workspace.adTitle && (
                    <p className="text-white font-bold text-xl leading-tight mb-1">
                      {workspace.adTitle}
                    </p>
                  )}
                  {workspace.adText && (
                    <p className="text-white/80 text-sm mb-3 line-clamp-2">
                      {workspace.adText}
                    </p>
                  )}
                  {workspace.adLinkUrl && (
                    <a
                      href={workspace.adLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/90 transition-colors"
                    >
                      Learn more <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : workspace?.adEnabled && (workspace.adTitle || workspace.adText) ? (
            /* No image — centered text card */
            <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-wa-sidebar-header">
              <div className="max-w-xs text-center space-y-2 px-8">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsored</p>
                {workspace.adTitle && <p className="font-semibold text-base">{workspace.adTitle}</p>}
                {workspace.adText && <p className="text-sm text-muted-foreground">{workspace.adText}</p>}
                {workspace.adLinkUrl && (
                  <a
                    href={workspace.adLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1 hover:underline"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Default — no ad configured */
            <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-wa-sidebar-header">
              <p className="text-sm text-muted-foreground">Select a chat to start messaging</p>
            </div>
          )
        )}

        <MessageFeed
          messages={activeMessages}
          currentUserId={currentUser.id}
          isGroupChat={isGroupChat}
          showUserDetails={isGroupChat}
          getSenderName={(senderId) => {
            const u = getUserById(senderId);
            return u?.displayName || 'Unknown';
          }}
          getSenderPhone={(senderId) => getMaskedPhone(senderId)}
          getSenderAvatar={(senderId) => {
            const u = getUserById(senderId);
            return u?.avatar;
          }}
          onReply={(msg) => {
            const u = getUserById(msg.senderId);
            setReplyingTo({ message: msg, senderName: u?.displayName || 'Unknown' });
          }}
          onDelete={handleDelete}
        />
        {/* DM typing indicator */}
        {isDMChat && dmTargetTyping && (
          <TypingIndicator name={dmTarget?.displayName || 'User'} />
        )}
        {/* Group typing indicator */}
        {isGroupChat && groupTyping && (
          <TypingIndicator
            name={
              groupTypingUserIds.length === 1
                ? (getUserById(groupTypingUserIds[0])?.displayName || 'Someone')
                : groupTypingUserIds.length > 1
                ? `${groupTypingUserIds.length} people`
                : 'Someone'
            }
          />
        )}
        {(() => {
          if (isDMChat) return isChatEnabled;
          if (isGroupChat && activeGroup) return !isMemberMuted(activeGroup.id, currentUser.id);
          return true;
        })() ? (
          <MessageComposer
            onSend={handleSend}
            onTyping={handleTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        ) : (
          <div className="px-4 py-3 text-center bg-wa-sidebar-header">
            <p className="text-sm text-muted-foreground">
              {isGroupChat ? '🔇 You are muted in this group' : '💬 Chat is disabled'}
            </p>
          </div>
        )}

        {activeGroup && (
          <GroupInfoPanel group={activeGroup} open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
        )}
      </div>
      {/* First-login profile setup */}
      <SetupProfileModal
        open={showProfileSetup}
        onClose={() => {
          setShowProfileSetup(false);
          if (currentUser) {
            localStorage.setItem(`profile-setup-dismissed-${currentUser.id}`, '1');
          }
        }}
      />
    </div>
  );
};

export default UserDashboard;
