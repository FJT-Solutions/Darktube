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

    // Return binary content directly
    return new Response(content, {
      headers: {
        'Content-Type': mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error fetching file from database storage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
