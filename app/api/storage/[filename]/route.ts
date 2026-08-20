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

    const result = await pool.query(
      'SELECT content, mime_type FROM public.storage_files WHERE filename = $1',
      [filename]
    )

    if (result.rows.length === 0) {
      return new Response('File not found', { status: 404 })
    }

    const { content, mime_type } = result.rows[0]
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const totalSize = buffer.length
    const contentType = mime_type || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg')

    const rangeHeader = request.headers.get('range')

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
          'Cache-Control': 'public, max-age=31536000, immutable',
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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error fetching file from database storage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
