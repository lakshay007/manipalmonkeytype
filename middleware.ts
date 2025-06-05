import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple rate limiting store (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(ip);
  
  if (!current) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Different limits for different endpoints
    let maxRequests = 60; // Default: 60 requests per minute
    let windowMs = 60000; // 1 minute
    
    // Stricter limits for expensive operations
    if (request.nextUrl.pathname.includes('/link-monkeytype') || 
        request.nextUrl.pathname.includes('/refresh-scores')) {
      maxRequests = 5; // 5 requests per minute for scraping endpoints
      windowMs = 60000;
    }
    
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }
  }
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none';"
  );
  
  // Add rate limit headers for API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const current = rateLimitMap.get(ip);
    if (current) {
      response.headers.set('X-RateLimit-Limit', '60');
      response.headers.set('X-RateLimit-Remaining', String(Math.max(0, 60 - current.count)));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(current.resetTime / 1000)));
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 