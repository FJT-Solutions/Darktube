// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/crypto'
import { logger } from '@/lib/logger'

// High-speed regex test for malicious scanner probes & exploit fuzzers
const BOT_PROBE_EXTENSIONS = /\.(env.*|php\d?|asp|aspx|jsp|jspx|cgi|sh|py|rb|pl|yaml|yml|sql|bak|old|swp|save|orig|dist|sample|example|test|temp|tmp|log|ini|cfg|conf|config|lock|properties|db|sqlite|tar|gz|zip|rar|7z|tgz|bz2|axd|key|crt|pem|cer|der|pfx|p12|tfstate.*|tfvars.*)$/i
const BOT_PROBE_DIRECTORIES = /^\/(\.git|\.env|\.aws|\.docker|\.kube|\.ssh|\.config|wp-|wordpress|blog\/wp-|blog\/wordpress|phpinfo|info\.php|_profiler|_environment|symfony|vendor|server-status|server-info|phpmyadmin|pma|adminer|solr|actuator|swagger|api-docs|cgi-bin|webroot|htdocs|public_html|laravel|drupal|joomla|magento|prestashop)/i

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Silent defense against automated bot scanners and vulnerability fuzzers
  // Prevents thousands of spam lines in server logs and prevents redirection of bots to /login
  if (BOT_PROBE_EXTENSIONS.test(pathname) || BOT_PROBE_DIRECTORIES.test(pathname)) {
    return new NextResponse(null, { status: 404 })
  }

  // 2. Protect Server Actions from malformed bot probes (prevents: Error: Server Reference ID did not match)
  const nextActionHeader = request.headers.get('next-action')
  if (nextActionHeader) {
    // Valid Next.js server action IDs are at least 32 characters long
    if (nextActionHeader.length < 20 || /^(x|\d+|action|test|undefined|null)$/i.test(nextActionHeader)) {
      return new NextResponse(null, { status: 400 })
    }
  }

  // Permitir assets estáticos e arquivos de mídia em /storage/ ou com extensões de mídia
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|m4a|mp3|wav)$/i) || pathname.startsWith('/storage/')) {
    return NextResponse.next()
  }

  const publicRoutes = ['/login', '/invite', '/auth/callback', '/pending', '/setup-password', '/api/storage', '/storage']
  const isPublic = pathname === '/' || publicRoutes.some(r => pathname.startsWith(r))

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
                         pathname === '/sitemap.xml'

    if (isStaticAsset) {
      return NextResponse.next()
    }

    // Only log unauthenticated access for legitimate app routes at debug level
    logger.debug(`[Auth] Redirecionando acesso não autenticado para /login: ${pathname}`)
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

// Next.js 16 backward compatibility alias in case middleware is invoked
export const middleware = proxy

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_vercel|static|js|assets|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
