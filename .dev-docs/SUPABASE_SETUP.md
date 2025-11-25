# Supabase Setup & Authentication Guide

**Project:** Proxycon 2025  
**Last Updated:** November 24, 2025  
**Next.js Version:** 16.0.4  
**Pattern:** Next.js 15/16 Async Cookie Pattern with Supabase SSR

---

## Overview

This document outlines the **modern, correct patterns** for integrating Supabase authentication with Next.js 16 App Router. This prevents regression to outdated SSR patterns that cause database connection issues.

---

## Architecture

### Three-File Structure

1. **`utils/supabase/server.ts`** - Server-side client for Server Components
2. **`utils/supabase/client.ts`** - Browser client for Client Components  
3. **`utils/supabase/middleware.ts`** - Session refresh & auth state sync logic
4. **`proxy.ts`** (root) - Next.js proxy that runs middleware before routes

---

## 1. Server Client (`utils/supabase/server.ts`)

### ✅ CORRECT Pattern (Next.js 15/16 Async Cookies)

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // 🔴 CRITICAL: Must use `await cookies()`
  // This is async in Next.js 15+ due to dynamic server context
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
            // Ignored: Can occur in Server Components during streaming
            // Middleware will handle session refresh instead
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignored: Middleware handles this
          }
        },
      },
    }
  )
}
```

### ❌ OLD Pattern (Pre-Next.js 15)

```typescript
// DON'T DO THIS - It's outdated!
export function createClient() {
  const cookieStore = cookies() // ❌ Missing `await`
  // ... rest of code
}
```

### Why This Changed

- **Next.js 15+** made `cookies()` async to support dynamic server context
- Without `await`, you'll get `Promise` objects instead of actual cookie values
- This causes auth to fail silently in SSR

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

### Usage in Client Components

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function LoginForm() {
  const supabase = createClient() // Call inside component (not async)
  
  // Use supabase client in event handlers, useEffect, etc.
}
```

**Key Difference:** Browser client is NOT async. Use it only in Client Components (`'use client'`).

---

## 3. Middleware (`utils/supabase/middleware.ts`)

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
          // Sync cookies to response (for auth state persistence)
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Clear cookies on logout
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh auth session - this is crucial for keeping users logged in
  await supabase.auth.getUser()

  return response
}
```

### What This Does

1. **Creates Supabase client** for the request context
2. **Refreshes auth session** - `await supabase.auth.getUser()` calls Supabase backend
3. **Syncs cookies** - Updated session state is returned to browser
4. **Runs on every request** - Keeps session fresh across page navigations

### Why `await supabase.auth.getUser()` is Critical

- It verifies the session token with Supabase backend
- If token is expired, it attempts refresh using refresh token
- Returns updated cookies if refresh succeeded
- Runs BEFORE your app routes, ensuring auth state is always current

---

## 4. Proxy (`proxy.ts` at project root)

### ✅ CORRECT Pattern (Next.js 16)

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### ❌ OLD Pattern (Pre-Next.js 16)

```typescript
// DON'T USE - This is deprecated!
export async function middleware(request: NextRequest) {
  // ...
}
```

**Next.js 16 deprecated `middleware.ts`** in favor of `proxy.ts` to clarify its purpose as a network proxy, not Express-like middleware.

---

## 5. Using Server Client in Pages/Components

### ✅ CORRECT Pattern in Server Components

```typescript
// app/page.tsx
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  // Create client inside Server Component
  const supabase = await createClient()

  // Fetch data using Supabase
  const { data: players } = await supabase
    .from('players')
    .select('*')

  return (
    <main>
      <h1>Registered Players</h1>
      {players?.map((player) => (
        <div key={player.id}>
          {player.name} (Wins: {player.wins})
        </div>
      ))}
    </main>
  )
}
```

### Key Points

- ✅ `await createClient()` - Must await the async function
- ✅ Function is `async` - Top-level await requires this
- ✅ Direct data fetching - No useState or useEffect needed
- ✅ Auto-SSR - Data fetched on server, HTML sent to browser

### ❌ Common Mistakes

```typescript
// ❌ WRONG - Missing await
const supabase = createClient()
const { data } = await supabase.from('players').select()

// ❌ WRONG - In Client Component without 'use client'
export default async function Page() {
  const supabase = await createClient()
  // ...
}

// ❌ WRONG - Trying to use in useEffect without 'use client'
useEffect(() => {
  const supabase = await createClient() // ❌ Can't use await here
}, [])
```

---

## Environment Variables

### Required in `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Important Notes

- **`NEXT_PUBLIC_`** prefix = Exposed to browser (safe, they're public keys)
- These are NOT secrets - anyone can view them in network tab
- Real security comes from Supabase Row Level Security (RLS) policies
- Keep `.env.local` in `.gitignore` to prevent accidental commits

### Testing Env Vars Are Set

```bash
# Check if env vars are loaded
echo $env:NEXT_PUBLIC_SUPABASE_URL
echo $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Common Issues & Fixes

### Issue: "Invalid source map" errors

**Cause:** TypeScript compilation issues, often from cookies() pattern mismatch

**Fix:** 
1. Ensure all `cookies()` calls use `await`
2. Restart dev server: `npm run dev`
3. Clear `.next` folder if needed: `rm -r .next && npm run dev`

---

### Issue: User logs in but session not persisting

**Cause:** Proxy not running or cookies not syncing

**Fix:**
1. Verify `proxy.ts` exists (not deprecated `middleware.ts`)
2. Check that `await supabase.auth.getUser()` is in middleware
3. Ensure cookies are being set in response

---

### Issue: "Cannot use await at top level" in Client Components

**Cause:** Forgetting `'use client'` directive

**Fix:**
```typescript
'use client' // Add this at top of file

export function MyComponent() {
  // Now you can use hooks, event handlers, etc.
}
```

---

## Session Refresh Flow

```
1. User navigates to page
   ↓
2. proxy.ts runs BEFORE route handler
   ↓
3. updateSession() creates Supabase client
   ↓
4. await supabase.auth.getUser() calls backend
   ↓
5. Backend verifies/refreshes session token
   ↓
6. New cookies sent in response (if refreshed)
   ↓
7. Browser updates cookie jar
   ↓
8. Page route now has fresh auth context
```

---

## Checklist for New Features

Before adding authentication or data fetching:

- [ ] Using Server Components where possible (not Client Components)
- [ ] Using `await createClient()` in async Server Components
- [ ] Using browser client only with `'use client'` directive
- [ ] Session refresh logic in `utils/supabase/middleware.ts`
- [ ] Proxy configured with correct matcher pattern
- [ ] Environment variables set in `.env.local`
- [ ] Supabase RLS policies configured for data access
- [ ] No hardcoded URLs or API keys

---

## Useful Resources

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js 16 Proxy Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js Async Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Nov 24, 2025 | 1.0.0 | Initial setup - Migrated from deprecated middleware.ts to proxy.ts pattern |
