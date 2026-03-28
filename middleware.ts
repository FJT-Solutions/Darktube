// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log(`[Middleware] Request: ${request.nextUrl.pathname}`)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Rotas públicas
  const publicRoutes = ['/login', '/invite', '/auth/callback', '/pending', '/setup-password']
  const pathname = request.nextUrl.pathname
  
  // A raiz '/' deve ser correspondência exata
  // Outras rotas públicas podem ser prefixos
  const isPublic = pathname === '/' || publicRoutes.some(r => pathname.startsWith(r))

  // Allow static assets
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    return supabaseResponse
  }

  if (!user && !isPublic) {
    console.log(`[Middleware] Blocking unauthenticated access to: ${pathname}`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar se usuário está aprovado
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'pending') {
      if (request.nextUrl.pathname !== '/pending') {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
    } else if (profile?.status === 'rejected' || profile?.status === 'blocked') {
      await supabase.auth.signOut()
      const reason = profile?.status === 'blocked' ? 'blocked' : 'rejected'
      return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url))
    }

    // Proteger rotas de admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
