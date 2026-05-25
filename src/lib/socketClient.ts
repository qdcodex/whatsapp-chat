import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private userId: string = '';
  private workspaceId: string = '';
  private listeners: Map<string, Set<Function>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  connect(userId: string, workspaceId: string) {
    if (this.socket?.connected) return this.socket;

    this.userId = userId;
    this.workspaceId = workspaceId;

    // Determine socket URL explicitly
    const socketUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');

    this.socket = io(socketUrl, {
      query: { userId, workspaceId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.notifyListeners('connected', { userId, socketId: this.socket?.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.notifyListeners('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.notifyListeners('error', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      if (this.socket) {
        this.socket.on(event, (data) => {
          this.notifyListeners(event, data);
        });
      }
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Cannot emit ${event}`);
    }
  }

  // Typing indicator with debounce
  startTyping(targetId?: string, groupId?: string) {
    this.emit('user:typing-start', { targetId, groupId });
  }

  stopTyping(targetId?: string, groupId?: string) {
    this.emit('user:typing-stop', { targetId, groupId });
  }

  // Debounced typing (WhatsApp-like behavior)
  // Sends immediately on first keystroke, then debounces subsequent updates
  setTypingWithDebounce(targetId?: string, groupId?: string) {
    const key = groupId ? `group:${groupId}` : `user:${targetId}`;

    // If no timeout exists, send typing-start immediately
    if (!this.typingTimeouts.has(key)) {
      this.startTyping(targetId, groupId);
    } else {
      // Clear existing timeout to extend the typing period
      clearTimeout(this.typingTimeouts.get(key)!);
    }

    // Auto-stop after 1 second of inactivity (much faster than before)
    const timeout = setTimeout(() => {
      this.stopTyping(targetId, groupId);
      this.typingTimeouts.delete(key);
    }, 1000);

    this.typingTimeouts.set(key, timeout);
  }

  requestOnlineUsers() {
    this.emit('request:online-users');
  }

  private notifyListeners(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => {
      callback(data);
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }
}

export const socketClient = new SocketClient();
