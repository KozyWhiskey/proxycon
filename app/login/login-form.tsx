'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { login, signInWithGoogle } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full h-12 text-base font-medium " disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {text}
    </Button>
  )
}

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword,setShowPassword]=useState(false)

  async function handleLogin(formData: FormData) {
    const res = await login(formData)
    if (res?.message) {
      toast.error(res.message)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    const data = new FormData()
    if (nextPath) data.set('next', nextPath)
    try {
      const res = await signInWithGoogle(data)
      if (res?.message) {
        toast.error(res.message)
        setIsGoogleLoading(false)
      }
    } catch {
      // Redirect throws an error, so we might land here even on success if handling is tricky,
      // but the server action handles the redirect.
      setIsGoogleLoading(false)
    }
  }


  return (
    <Card className="w-full max-w-md mx-auto glass-panel border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-left font-sans">Existing account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Email or Google for an account you already have.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            type="button" 
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or use email</span>
            </div>
          </div>

          <form action={handleLogin} className="space-y-4">
            {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="bg-card border-border focus-visible:ring-primary/20 focus-visible:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="bg-card border-border focus-visible:ring-primary/20 focus-visible:border-primary/50"
              />
            </div>
            <div className="action-row"><button type="button" className="text-link min-h-11" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?"Hide password":"Show password"}</button><Link href={`/login/forgot-password?next=${encodeURIComponent(nextPath||"/")}`}>Forgot password?</Link></div><SubmitButton text="Sign in" />
          </form>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild variant="link" className="text-muted-foreground hover:text-foreground">
          <Link href={`/?next=${encodeURIComponent(nextPath||"/")}`}>Back to the name list</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
