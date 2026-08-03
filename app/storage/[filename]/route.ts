import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    // Proxy stream to Hyperframes service (3002) or Remotion service (3001) on VPS
    const rangeHeader = request.headers.get('range') || '';
    const hyperframesUrl = `http://localhost:3002/storage/${filename}`;
    const remotionUrl = `http://localhost:3001/storage/${filename}`;

    let fetchHeaders: Record<string, string> = {};
    if (rangeHeader) {
      fetchHeaders['range'] = rangeHeader;
    }

    let response = await fetch(hyperframesUrl, { headers: fetchHeaders }).catch(() => null);

    if (!response || !response.ok) {
      response = await fetch(remotionUrl, { headers: fetchHeaders }).catch(() => null);
    }

    if (!response || !response.ok) {
      return new NextResponse('File not found', { status: 404 });
    }

    const contentType =
      response.headers.get('content-type') ||
      (filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400, immutable',
    };

    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;

    return new NextResponse(response.body as any, {
      status: response.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error proxying video file stream:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
