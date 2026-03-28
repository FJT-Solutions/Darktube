import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('URL is required', { status: 400 });
    }

    try {
        console.log(`[Image Proxy] Original URL: ${imageUrl}`);
        
        // 1. Decodificar a URL da query string
        let decodedUrl = decodeURIComponent(imageUrl);
        
        // 2. Corrigir entidades HTML comuns (&amp; -> &) que o Meta costuma injetar
        decodedUrl = decodedUrl.replace(/&amp;/g, '&');
        
        console.log(`[Image Proxy] Fetching decoded: ${decodedUrl}`);

        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.facebook.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error(`[Image Proxy] Remote server returned ${response.status} for ${decodedUrl}`);
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error: any) {
        console.error('[Image Proxy] Error:', error.message);
        return new NextResponse('Failed to load image', { status: 502 });
    }
}
