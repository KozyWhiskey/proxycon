import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
  if (user && !user.is_anonymous && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    const next = request.nextUrl.searchParams.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
