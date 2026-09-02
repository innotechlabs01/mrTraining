import { NextRequest, NextResponse } from 'next/server';

const GO_API_BASE = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:3001';

async function forward(req: NextRequest, params: { proxy: string[] }) {
  const pathSegments = params.proxy ?? [];
  const goPath = `/api/v1/${pathSegments.join('/')}`;
  const url = `${GO_API_BASE}${goPath}`;

  // Forward request
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (['host', 'connection', 'content-length'].includes(key)) return;
    headers.append(key, value);
  });

  // Ensure Authorization is forwarded if present
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
  };

  try {
    const goRes = await fetch(url, init);
    const buffer = await goRes.arrayBuffer();
    const contentType = goRes.headers.get('content-type') || 'application/octet-stream';

    // Propagate rate limit headers
    const responseHeaders = new Headers();
    goRes.headers.forEach((v, k) => {
      if (k.toLowerCase().startsWith('x-ratelimit') || k.toLowerCase() === 'retry-after') {
        responseHeaders.set(k, v);
      }
    });
    responseHeaders.set('API-Version', 'v1');
    responseHeaders.set('Content-Type', contentType);

    return new NextResponse(buffer, { status: goRes.status, headers: responseHeaders });
  } catch (err) {
    console.error('[proxy] Go API error', err);
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forward(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forward(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forward(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forward(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forward(req, params);
}
