import { safeNext } from '@/lib/continuation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { performanceEnabled, performanceId, timedFetch } from '@/lib/performance'

export async function updateSession(request: NextRequest) {
  // Disposable visual fixtures must not create Supabase anonymous users or depend
  // on auth quotas. The page independently returns 404 outside this dev flag.
  if (process.env.NODE_ENV==='development'&&process.env.WEEKEND_UX_PREVIEW==='true'&&['/dev/weekend','/dev/weekend-review'].includes(request.nextUrl.pathname)) {const previewHeaders=new Headers(request.headers);previewHeaders.set('x-proxycon-preview','weekend');return NextResponse.next({request:{headers:previewHeaders}})}
  if (process.env.NODE_ENV === 'development' && process.env.DECK_MEMORY_PREVIEW === 'true' && request.nextUrl.pathname === '/dev/deck-memory') {
    return NextResponse.next({ request: { headers: request.headers } })
  }
  if (performanceEnabled()) request.headers.set('x-proxycon-profile', performanceId(request.headers.get('x-proxycon-profile')))
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(performanceEnabled() ? { global: { fetch: timedFetch(performanceId(request.headers.get('x-proxycon-profile'))) } } : {}),
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This will refresh session if needed - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // A phone with no account becomes an anonymous device, then picks a player name.
  if (!user && !pathname.startsWith('/auth') && !pathname.startsWith('/login')) {
    const { error } = await supabase.auth.signInAnonymously()
    if (!error) {
      const redirectResponse = NextResponse.redirect(request.nextUrl)
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
      return redirectResponse
    }
    if (pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // If user is logged in and tries to access login page, continue to the invite they opened
  if (user && !user.is_anonymous && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    const next = request.nextUrl.searchParams.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return NextResponse.redirect(new URL(safeNext(next), request.url))
    }
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
