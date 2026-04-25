import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDiscordAuth } from '@/hooks/useDiscordAuth'
import { useAuth } from '@/providers/AuthProvider'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Bot, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup } = useAuth()
  const { startSignIn } = useDiscordAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await signup({ name, username, email, language: 'en', password })
        await login(email, password)
      }
      navigate({ to: '/' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ui-app-screen min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ui-deco-blob ui-deco-blob-a top-1/4 left-1/4" />
        <div className="ui-deco-blob ui-deco-blob-b bottom-1/4 right-1/4" />
      </div>

      <Card className="w-full max-w-md relative z-10 animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="ui-auth-logo">
              <Bot className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isLogin ? 'Sign in to your Fragment dashboard' : 'Get started with Fragment'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs font-medium text-surface-400 uppercase tracking-wider">Name</label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-xs font-medium text-surface-400 uppercase tracking-wider">Username</label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-surface-400 uppercase tracking-wider">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium text-surface-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <ErrorAlert error={error} />

            <LoadingButton id="submit-button" type="submit" className="w-full" isLoading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </LoadingButton>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-surface-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-2 text-surface-500">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => startSignIn()}
            className="w-full rounded-lg border border-[#5865F2] bg-[#5865F2]/10 py-2.5 text-sm font-medium text-[#5865F2] hover:bg-[#5865F2]/20 transition-colors"
          >
            Continue with Discord
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              className="text-sm text-blurple-400 hover:text-blurple-300 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
