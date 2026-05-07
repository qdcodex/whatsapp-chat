import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';

interface UseTypingIndicatorOptions {
  userId: string;
  workspaceId: string;
  targetId?: string; // For 1:1 chats
  groupId?: string; // For group chats
}

export function useTypingIndicator({
  userId,
  workspaceId,
  targetId,
  groupId,
}: UseTypingIndicatorOptions) {
  const { setTypingWithDebounce, startTyping, stopTyping } = useSocket({
    userId,
    workspaceId,
  });

  // Call this on every keystroke
  const handleInputChange = useCallback(() => {
    setTypingWithDebounce(targetId, groupId);
  }, [targetId, groupId, setTypingWithDebounce]);

  // Call this when user stops typing or submits
  const handleInputBlur = useCallback(() => {
    stopTyping(targetId, groupId);
  }, [targetId, groupId, stopTyping]);

  // Call this when message is sent
  const handleMessageSent = useCallback(() => {
    stopTyping(targetId, groupId);
  }, [targetId, groupId, stopTyping]);

  return {
    handleInputChange,
    handleInputBlur,
    handleMessageSent,
  };
}
