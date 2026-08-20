import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    const rangeHeader = request.headers.get('range') || '';
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) fetchHeaders['range'] = rangeHeader;

    const urls = [
      `http://n8n-remotionservice-ry6eh9:3001/storage/${filename}`,
      `http://localhost:3001/storage/${filename}`
    ];

    let response: Response | null = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: fetchHeaders });
        if (res.ok) {
          response = res;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    if (response && response.ok) {
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
    }

    // 2. Fallback to PostgreSQL database storage
    const dbRes = await pool.query(
      'SELECT content, mime_type FROM public.storage_files WHERE filename = $1',
      [filename]
    );

    if (dbRes.rows.length > 0) {
      const { content, mime_type } = dbRes.rows[0];
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      const totalSize = buffer.length;
      const contentType = mime_type || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');

      if (rangeHeader && contentType.startsWith('video/')) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start < totalSize && end < totalSize && start <= end) {
          const chunkSize = end - start + 1;
          const chunk = buffer.subarray(start, end + 1);

          return new Response(chunk, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('File not found', { status: 404 });
  } catch (error: any) {
    console.error('Error proxying video file stream:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
