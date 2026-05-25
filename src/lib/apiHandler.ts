import { NextResponse } from 'next/server';

/**
 * Wraps an API route handler with try/catch so MongoDB errors (and any other
 * unhandled exceptions) return a proper JSON { error } response instead of an
 * empty 500 that crashes the client with "Unexpected end of JSON input".
 */
export async function withErrorHandling(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err: any) {
    console.error('[API Error]', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
