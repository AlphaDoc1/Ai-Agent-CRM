
import { getSession } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // SAFETY: only works in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const callSid = req.nextUrl.searchParams.get('callSid');
  if (!callSid) {
    return NextResponse.json(
      { error: 'callSid required' },
      { status: 400 }
    );
  }

  const session = await getSession(callSid);
  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  }

  // Redact sensitive fields before returning
  const safeSession = {
    ...session,
    callerPhone: '***REDACTED***'
  };

  return NextResponse.json(safeSession);
}

