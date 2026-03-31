// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Apenas logs em dev para ajudar debug visual
  // console.log(`[Middleware] Request: ${request.nextUrl.pathname}`)
  
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

  // Rotas públicas
  const publicRoutes = ['/login', '/invite', '/auth/callback', '/pending', '/setup-password']
  const pathname = request.nextUrl.pathname
  
  const isPublic = pathname === '/' || publicRoutes.some(r => pathname.startsWith(r))

  // Permitir assets estáticos (para garantir que os que escaparem do matcher passem)
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    return supabaseResponse
  }

  let user = null;
  
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    // Timeout ou erro leve de fetch no Edge: tentamos não derrubar o app se já tiver cookie
    console.error(`[Middleware] Falha ao verificar JWT:`, error)
    // Se isPublic, apenas seguir. Senão, se falhou por fetch failed mas cookies de auth existem, 
    // preferiremos confiar nas rotas filhas para validar 100% ou falhá-las graciosamente.
    // Mas a prática de segurança manda redirecionar ao /login se estourou de fato sem user
    const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('sb-') && c.name.includes('-auth-token'))
    if (!hasAuthCookie && !isPublic) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (!user && !isPublic) {
    console.log(`[Middleware] Blocking unauthenticated access to: ${pathname}`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar se o usuário está aprovado apenas se for estritamente necessário
  // Usamos um try/catch isolado para não derrubar a sessão ativa se a query estourar o limite do Edge
  if (user && !isPublic) {
    try {
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
        // Importante aguardar signOut se o usuário estiver banido
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
    } catch (profileError) {
       // Se der timeout consultando a tabela 'profiles', apenas printa e deixa rolar
       // Evitamos o logoff forçado caindo neste bloco
       console.error(`[Middleware] Timeout buscando profile (permitindo acesso passivo):`, profileError)
    }
  }

  return supabaseResponse
}

export const config = {
  // Adicionado exclusão de /api/* para não engargalar o middleware de requisições de backend
  matcher: ['/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
