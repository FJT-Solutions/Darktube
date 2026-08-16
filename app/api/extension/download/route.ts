import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), 'public', 'dark-clips-extension.zip');
    const extensionDir = path.join(process.cwd(), 'extension');

    // Dynamically re-compress to always deliver the newest version
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
          timeout: 10000,
        });
      }
    } catch (e) {
      console.warn('[Extension Download] Recompression warning:', e);
    }

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ success: false, error: 'Arquivo da extensão não encontrado.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="dark-clips-extension.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Error serving extension zip:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
