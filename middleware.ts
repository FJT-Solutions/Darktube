// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/crypto'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const publicRoutes = ['/login', '/invite', '/auth/callback', '/pending', '/setup-password', '/api/storage']
  const isPublic = pathname === '/' || publicRoutes.some(r => pathname.startsWith(r))

  // Permitir assets estáticos
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('darktube_session')
  let user = null

  if (sessionCookie?.value) {
    user = await verifyJWT(sessionCookie.value)
  }

  if (!user && !isPublic) {
    const isStaticAsset = pathname.startsWith('/static/') || 
                         pathname.startsWith('/js/') || 
                         pathname.startsWith('/assets/') || 
                         pathname === '/robots.txt' ||
                         pathname === '/sitemap.xml';

    if (isStaticAsset) {
      return NextResponse.next();
    }

    console.log(`[Middleware] Bloqueando acesso não autenticado para: ${pathname}`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Verificar status do usuário
    if (user.status === 'pending') {
      if (pathname !== '/pending') {
        return NextResponse.redirect(new URL(`/pending?email=${encodeURIComponent(user.email)}`, request.url))
      }
    } else if (user.status === 'rejected' || user.status === 'blocked') {
      const reason = user.status === 'blocked' ? 'blocked' : 'rejected'
      const response = NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url))
      response.cookies.delete('darktube_session')
      return response
    }

    // Proteger rotas de admin
    if (pathname.startsWith('/admin')) {
      if (user.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Redirecionar usuário logado se tentar ir para login ou invite
    if (pathname === '/login' || pathname === '/invite') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_vercel|static|js|assets|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
