import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;
const userSockets = new Map<string, string[]>(); // userId -> socketIds[]
const workspaceUsers = new Map<string, Set<string>>(); // workspaceId -> Set<userId>

export function getSocketIOInstance(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO first.');
  }
  return io;
}

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          process.env.SOCKET_IO_CORS_ORIGIN,
        ].filter(Boolean);

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS rejected origin: ${origin}`);
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    const workspaceId = socket.handshake.query.workspaceId as string;

    if (!userId || !workspaceId) {
      console.log('Missing userId or workspaceId');
      socket.disconnect();
      return;
    }

    // Track this socket for the user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, []);
    }
    userSockets.get(userId)?.push(socket.id);

    // Track this user in their workspace
    if (!workspaceUsers.has(workspaceId)) {
      workspaceUsers.set(workspaceId, new Set());
    }
    workspaceUsers.get(workspaceId)!.add(userId);

    socket.join(`user:${userId}`);
    socket.join(`workspace:${workspaceId}`);

    console.log(`User ${userId} connected to workspace ${workspaceId}`);

    socket.emit('connected', { userId, workspaceId, socketId: socket.id });

    // Notify others that user is online
    io?.to(`workspace:${workspaceId}`).emit('user:online', {
      userId,
      timestamp: Date.now(),
      socketId: socket.id,
    });

    // Message events
    socket.on('message:send', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:new', data);
    });

    socket.on('message:status-update', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:status-update', data);
    });

    socket.on('message:delete', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:deleted', data);
    });

    // Profile updates — broadcast to everyone in the workspace
    socket.on('user:profile-updated', (data: { userId: string; displayName?: string; avatar?: string }) => {
      io?.to(`workspace:${workspaceId}`).emit('user:profile-updated', {
        userId: data.userId,
        displayName: data.displayName,
        avatar: data.avatar,
      });
    });

    // Typing indicators with auto-stop timeout
    const typingTimeouts = new Map<string, NodeJS.Timeout>();

    socket.on('user:typing-start', (data) => {
      const { targetId, groupId } = data;

      // Clear existing timeout
      const timeoutKey = groupId ? `group:${groupId}` : `user:${targetId}`;
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey)!);
      }

      // For DMs: send to target user's room
      if (targetId) {
        io?.to(`user:${targetId}`).emit('user:typing-start', {
          userId,
          targetId,
          timestamp: Date.now(),
        });
      }
      // For groups: send to workspace room (clients never join group rooms directly)
      // Include groupId so clients can filter by active group
      if (groupId) {
        io?.to(`workspace:${workspaceId}`).emit('user:typing-start', {
          userId,
          groupId,
          workspaceId,
          timestamp: Date.now(),
        });
      }

      // Auto-stop after 3 seconds of inactivity (matches client debounce)
      const timeout = setTimeout(() => {
        if (targetId) {
          io?.to(`user:${targetId}`).emit('user:typing-stop', {
            userId,
            targetId,
            timestamp: Date.now(),
          });
        }
        if (groupId) {
          io?.to(`workspace:${workspaceId}`).emit('user:typing-stop', {
            userId,
            groupId,
            workspaceId,
            timestamp: Date.now(),
          });
        }
        typingTimeouts.delete(timeoutKey);
      }, 3000);

      typingTimeouts.set(timeoutKey, timeout);
    });

    socket.on('user:typing-stop', (data) => {
      const { targetId, groupId } = data;
      const timeoutKey = groupId ? `group:${groupId}` : `user:${targetId}`;

      // Clear timeout
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey)!);
        typingTimeouts.delete(timeoutKey);
      }

      if (targetId) {
        io?.to(`user:${targetId}`).emit('user:typing-stop', {
          userId,
          targetId,
          timestamp: Date.now(),
        });
      }
      if (groupId) {
        io?.to(`workspace:${workspaceId}`).emit('user:typing-stop', {
          userId,
          groupId,
          workspaceId,
          timestamp: Date.now(),
        });
      }
    });

    // Sync online status on demand — scoped to this socket's workspace only
    socket.on('request:online-users', () => {
      const wsUsers = workspaceUsers.get(workspaceId);
      const onlineUsers = wsUsers ? Array.from(wsUsers) : [];
      socket.emit('online-users', { onlineUsers, timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      // Remove socket from user tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          userSockets.delete(userId);
          workspaceUsers.get(workspaceId)?.delete(userId);
          // Notify others that user is completely offline
          io?.to(`workspace:${workspaceId}`).emit('user:offline', {
            userId,
            timestamp: Date.now(),
          });
        }
      }
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

export function broadcastMessage(event: string, data: any, room?: string) {
  if (!io) return;
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}

export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && (userSockets.get(userId)?.length ?? 0) > 0;
}
