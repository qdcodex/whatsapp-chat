import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

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
      origin: process.env.NODE_ENV === 'production'
        ? (origin, callback) => callback(null, true)
        : 'http://localhost:3000',
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
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);
    socket.join(`workspace:${workspaceId}`);

    socket.emit('connected', { userId, workspaceId });

    socket.on('message:send', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:new', data);
    });

    socket.on('message:status-update', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:status-update', data);
    });

    socket.on('message:delete', (data) => {
      io?.to(`workspace:${workspaceId}`).emit('message:deleted', data);
    });

    socket.on('user:online', () => {
      io?.to(`workspace:${workspaceId}`).emit('user:online', { userId, timestamp: Date.now() });
    });

    socket.on('user:typing-start', (data) => {
      const { targetId, groupId } = data;
      if (targetId) {
        io?.to(`user:${targetId}`).emit('user:typing-start', { userId, targetId });
      }
      if (groupId) {
        io?.to(`group:${groupId}`).emit('user:typing-start', { userId, groupId });
      }
    });

    socket.on('user:typing-stop', (data) => {
      const { targetId, groupId } = data;
      if (targetId) {
        io?.to(`user:${targetId}`).emit('user:typing-stop', { userId, targetId });
      }
      if (groupId) {
        io?.to(`group:${groupId}`).emit('user:typing-stop', { userId, groupId });
      }
    });

    socket.on('disconnect', () => {
      io?.to(`workspace:${workspaceId}`).emit('user:offline', { userId, timestamp: Date.now() });
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
