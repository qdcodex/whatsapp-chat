type BroadcastEvent = {
  type: 'message' | 'presence';
  action: 'add' | 'update' | 'delete';
  data: any;
  timestamp: number;
};

class BroadcastChannelSync {
  private messageChannel: BroadcastChannel | null = null;
  private presenceChannel: BroadcastChannel | null = null;
  private messageListeners: Set<(event: BroadcastEvent) => void> = new Set();
  private presenceListeners: Set<(event: BroadcastEvent) => void> = new Set();

  initialize() {
    if (typeof window === 'undefined') return;

    try {
      this.messageChannel = new BroadcastChannel('broadcast-hub-messages');
      this.messageChannel.onmessage = (event) => {
        this.messageListeners.forEach((listener) => listener(event.data));
      };

      this.presenceChannel = new BroadcastChannel('broadcast-hub-presence');
      this.presenceChannel.onmessage = (event) => {
        this.presenceListeners.forEach((listener) => listener(event.data));
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }

  broadcastMessage(action: 'add' | 'update' | 'delete', data: any) {
    if (!this.messageChannel) return;
    const event: BroadcastEvent = {
      type: 'message',
      action,
      data,
      timestamp: Date.now(),
    };
    this.messageChannel.postMessage(event);
  }

  broadcastPresence(action: 'add' | 'update' | 'delete', data: any) {
    if (!this.presenceChannel) return;
    const event: BroadcastEvent = {
      type: 'presence',
      action,
      data,
      timestamp: Date.now(),
    };
    this.presenceChannel.postMessage(event);
  }

  onMessageSync(listener: (event: BroadcastEvent) => void) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onPresenceSync(listener: (event: BroadcastEvent) => void) {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  destroy() {
    this.messageChannel?.close();
    this.presenceChannel?.close();
    this.messageListeners.clear();
    this.presenceListeners.clear();
  }
}

export const broadcastChannelSync = new BroadcastChannelSync();
