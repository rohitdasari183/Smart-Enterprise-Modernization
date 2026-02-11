// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // Protect API routes
  if (url.startsWith('/api/')) {
    const apiKey = req.headers.get('x-api-key');
    const validKey = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY;
    if (!apiKey || apiKey !== validKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
