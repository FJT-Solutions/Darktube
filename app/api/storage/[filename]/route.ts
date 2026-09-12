// app/api/storage/[filename]/route.ts
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db-client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    let result = await pool.query(
      'SELECT content, mime_type FROM public.storage_files WHERE filename = $1',
      [filename]
    )

    // Fallback para variação de prefixo rendered_
    if (result.rows.length === 0) {
      const altFilename = filename.startsWith('rendered_')
        ? filename.replace(/^rendered_/, '')
        : `rendered_${filename}`;
      result = await pool.query(
        'SELECT content, mime_type FROM public.storage_files WHERE filename = $1',
        [altFilename]
      );
    }

    const rangeHeader = request.headers.get('range');

    // Se ainda não encontrado no banco, verificar se está disponível no storage do Remotion
    if (result.rows.length === 0) {
      const CANDIDATE_URLS = [
        'http://n8n-remotionservice-ry6eh9:3001',
        process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
        process.env.REMOTION_SERVER_URL,
        'http://localhost:3001',
      ].filter(Boolean) as string[];

      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders['range'] = rangeHeader;

      const cleanFilename = filename.replace(/^rendered_/, '');
      for (const base of CANDIDATE_URLS) {
        try {
          const res = await fetch(`${base.replace(/\/+$/, '')}/storage/${cleanFilename}`, { headers: fetchHeaders });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
            const contentLength = res.headers.get('content-length');
            const contentRange = res.headers.get('content-range');
            const headers: Record<string, string> = {
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=3600, must-revalidate',
            };
            if (contentLength) headers['Content-Length'] = contentLength;
            if (contentRange) headers['Content-Range'] = contentRange;
            return new NextResponse(res.body as any, {
              status: res.status === 206 ? 206 : 200,
              headers,
            });
          }
        } catch (_) {}
      }

      return new Response('File not found', { status: 404 });
    }

    const { content, mime_type } = result.rows[0]
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const totalSize = buffer.length
    const contentType = mime_type || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg')

    if (rangeHeader && contentType.startsWith('video/')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1

      if (start >= totalSize || end >= totalSize || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
          },
        })
      }

      const chunkSize = end - start + 1
      const chunk = buffer.subarray(start, end + 1)

      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      })
    }

    // Return binary content directly
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error fetching file from database storage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
