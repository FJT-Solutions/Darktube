// app/api/storage/upload/route.ts
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db-client'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let filename = ''
    let mimeType = 'audio/mpeg'
    let buffer: Buffer

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const customFilename = formData.get('filename') as string | null

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }

      mimeType = file.type || 'audio/mpeg'
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'mp3'
      filename = customFilename || `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // Direct raw binary upload
      const arrayBuffer = await request.arrayBuffer()
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
      }
      mimeType = contentType || 'audio/mpeg'
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'mp3'
      filename = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      buffer = Buffer.from(arrayBuffer)
    }

    await pool.query(
      `INSERT INTO public.storage_files (filename, mime_type, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO UPDATE SET content = EXCLUDED.content, mime_type = EXCLUDED.mime_type`,
      [filename, mimeType, buffer]
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://darktube.fjt-solutions.com'
    const publicUrl = `${baseUrl}/api/storage/${filename}`

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
    })
  } catch (error: any) {
    console.error('Error uploading file to DB storage:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
