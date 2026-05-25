// IndexedDB wrapper for offline persistence
import type { Message } from '@/types';

const DB_NAME = 'broadcast-hub-db';
const DB_VERSION = 1;

interface DBStores {
  messages: {
    key: 'id';
    value: Message;
    indexes: [
      { name: 'workspaceId'; keyPath: 'workspaceId' },
      { name: 'groupId'; keyPath: 'groupId' },
      { name: 'timestamp'; keyPath: 'timestamp' },
    ];
  };
  offlineQueue: {
    key: 'id';
    value: {
      id: string;
      message: Omit<Message, 'id' | 'timestamp'>;
      createdAt: number;
      retries: number;
    };
  };
  metadata: {
    key: 'key';
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init() {
    if (this.initialized && this.db) return this.db;

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          msgStore.createIndex('groupId', 'groupId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Offline queue
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }

        // Metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async saveMessages(messages: Message[]) {
    const db = await this.init();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    messages.forEach((msg) => store.put(msg));

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMessagesByWorkspace(workspaceId: string): Promise<Message[]> {
    const db = await this.init();
    const tx = db.transaction('messages', 'readonly');
    const index = tx.objectStore('messages').index('workspaceId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(workspaceId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesByGroup(groupId: string): Promise<Message[]> {
    const db = await this.init();
    const tx = db.transaction('messages', 'readonly');
    const index = tx.objectStore('messages').index('groupId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(groupId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMessages(): Promise<Message[]> {
    const db = await this.init();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOldMessages(daysToKeep: number = 30) {
    const db = await this.init();
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const tx = db.transaction('messages', 'readwrite');
    const index = tx.objectStore('messages').index('timestamp');

    return new Promise<void>((resolve, reject) => {
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async addToOfflineQueue(
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<string> {
    const db = await this.init();
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queueItem = { id, message, createdAt: Date.now(), retries: 0 };

    const tx = db.transaction('offlineQueue', 'readwrite');
    const store = tx.objectStore('offlineQueue');
    store.put(queueItem);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getOfflineQueue() {
    const db = await this.init();
    const tx = db.transaction('offlineQueue', 'readonly');
    const store = tx.objectStore('offlineQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromOfflineQueue(id: string) {
    const db = await this.init();
    const tx = db.transaction('offlineQueue', 'readwrite');
    const store = tx.objectStore('offlineQueue');
    store.delete(id);

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async setMetadata(key: string, value: any) {
    const db = await this.init();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    store.put({ key, value, updatedAt: Date.now() });

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMetadata(key: string) {
    const db = await this.init();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    const db = await this.init();
    const tx = db.transaction(['messages', 'offlineQueue', 'metadata'], 'readwrite');

    tx.objectStore('messages').clear();
    tx.objectStore('offlineQueue').clear();
    tx.objectStore('metadata').clear();

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const idb = new IndexedDBService();
