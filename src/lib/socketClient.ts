import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private userId: string = '';
  private workspaceId: string = '';
  private listeners: Map<string, Set<Function>> = new Map();

  connect(userId: string, workspaceId: string) {
    if (this.socket?.connected) return this.socket;

    this.userId = userId;
    this.workspaceId = workspaceId;

    this.socket = io({
      query: { userId, workspaceId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.emit('user:online');
      this.notifyListeners('connected');
    });

    this.socket.on('disconnect', () => {
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
    }
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
}

export const socketClient = new SocketClient();
