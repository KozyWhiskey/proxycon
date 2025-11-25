import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const userId = request.cookies.get('proxycon_user_id')?.value
  const { pathname } = request.nextUrl

  // If no user and not on the login page, redirect to login
  if (!userId && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in and tries to access login page, redirect to home
  if (userId && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }


  let response = NextResponse.next({
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
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This is part of the standard Supabase middleware. We'll keep it.
  await supabase.auth.getUser()

  return response
}