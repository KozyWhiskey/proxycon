# Supabase Setup & Authentication Guide

**Project:** Proxycon 2025  
**Last Updated:** December 19, 2025  
**Next.js Version:** 16.0.10  
**Pattern:** Next.js 16 Proxy Pattern with Supabase SSR

---

## Overview

This document outlines the **modern, correct patterns** for integrating Supabase authentication with **Next.js 16**.

**Key Change in Next.js 16:** The `middleware.ts` file has been deprecated in favor of **`proxy.ts`** to clarify its role as a network boundary.

---

## Architecture

### Three-File Structure

1. **`utils/supabase/server.ts`** - Server-side client for Server Components
2. **`utils/supabase/client.ts`** - Browser client for Client Components  
3. **`utils/supabase/middleware.ts`** - Session refresh & auth state sync logic
4. **`proxy.ts`** (root) - Next.js Proxy entry point (formerly middleware)

---

## 1. Server Client (`utils/supabase/server.ts`)

### ✅ CORRECT Pattern (Async Cookies)

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // 🔴 CRITICAL: Must use `await cookies()`
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignored in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignored
          }
        },
      },
    }
  )
}
```

---

## 2. Browser Client (`utils/supabase/client.ts`)

### ✅ CORRECT Pattern

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 3. Middleware Logic (`utils/supabase/middleware.ts`)

### ✅ CORRECT Pattern

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
```

---

## 4. Root Proxy (`proxy.ts`)

### ✅ CORRECT Pattern (Next.js 16)

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## 5. Using Server Client in Pages/Components

### ✅ CORRECT Pattern

```typescript
// app/page.tsx
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  // ...
}
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Dec 19, 2025 | 1.0.2 | Updated to reflect Next.js 16 `proxy.ts` convention. |
| Dec 19, 2025 | 1.0.1 | Correction: Replaced `proxy.ts` with standard `middleware.ts` pattern. |
| Nov 24, 2025 | 1.0.0 | Initial setup |
