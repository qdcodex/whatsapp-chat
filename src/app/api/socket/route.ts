import { initializeSocketIO } from '@/lib/socketIO';

export async function GET(request: Request) {
  return new Response('Socket.io initialized', { status: 200 });
}

export async function POST(request: Request) {
  return new Response('Socket.io ready', { status: 200 });
}
