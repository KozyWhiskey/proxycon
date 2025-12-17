'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {text}
    </Button>
  )
}

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true)

  async function handleLogin(formData: FormData) {
    const res = await login(null, formData)
    if (res?.message) {
      toast.error(res.message)
    }
  }

  async function handleSignup(formData: FormData) {
    const res = await signup(null, formData)
    if (res?.message) {
      toast.error(res.message)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {isLogin
            ? 'Enter your credentials to access the platform'
            : 'Join the ProxyCon league'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={isLogin ? handleLogin : handleSignup} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Jace Beleren"
                required
                className="bg-slate-950 border-slate-800"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <SubmitButton text={isLogin ? 'Sign In' : 'Sign Up'} />
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          variant="link"
          className="text-slate-400 hover:text-white"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </Button>
      </CardFooter>
    </Card>
  )
}
